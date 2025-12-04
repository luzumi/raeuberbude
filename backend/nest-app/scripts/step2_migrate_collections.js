#!/usr/bin/env node
/**
 * Schritt 2: Migriere Collections von MongoDB nach MariaDB
 * Verbesserungen:
 * - Ermittelt Ziel-Tabellen-Spalten (INFORMATION_SCHEMA) und passt INSERTs an
 * - Unterstützt generisches Zielschema (id,mongo_id,data,created_at,updated_at)
 * - Formatiert DATETIME-Werte (ISO -> MySQL DATETIME)
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Konfiguration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

const BATCH_SIZE = 500;

// Caches
const tableColumnsCache = new Map(); // table -> [{name,type,isNullable,default}]

// User ID und Terminal ID Mapping
const userIdMap = new Map();
const terminalIdMap = new Map();

// Utility: format ISO timestamp -> MySQL DATETIME (keep fractional seconds if present)
function formatDatetime(val) {
  if (!val) return null;
  if (val instanceof Date) {
    // toISOString -> 'YYYY-MM-DDTHH:mm:ss.sssZ' -> remove T and Z
    return val.toISOString().replace('T', ' ').replace('Z', '');
  }
  if (typeof val === 'string') {
    // Accept strings like '2025-11-20T16:39:48.561Z'
    return val.replace('T', ' ').replace('Z', '');
  }
  return val;
}

async function getTableColumns(conn, tableName) {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [MYSQL_CFG.database, tableName]
  );
  const meta = rows.map(r => ({ name: r.COLUMN_NAME, type: r.COLUMN_TYPE, isNullable: r.IS_NULLABLE, default: r.COLUMN_DEFAULT }));
  tableColumnsCache.set(tableName, meta);
  return meta;
}

/**
 * Transform-Funktionen (wie vorher)
 */
function transformUser(doc) {
  const newId = uuidv4();
  const oldId = doc._id ? doc._id.toString() : uuidv4();
  userIdMap.set(oldId, newId);

  return {
    id: newId,
    username: doc.username || 'unknown',
    email: doc.email || `user_${oldId}@example.com`,
    password_hash: doc.password_hash || doc.passwordHash || doc.password || '',
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformAppTerminal(doc) {
  const newId = uuidv4();
  const oldId = doc._id ? doc._id.toString() : newId;
  terminalIdMap.set(doc.terminalId || oldId, newId);
  terminalIdMap.set(oldId, newId);

  let ownerId = null;
  if (doc.ownerId) ownerId = userIdMap.get(doc.ownerId.toString()) || null;
  if (!ownerId && doc.assigned_user_id) ownerId = userIdMap.get(doc.assigned_user_id.toString()) || null;

  return {
    id: newId,
    terminal_id: doc.terminalId || doc.terminal_id || oldId,
    name: doc.name || 'Terminal',
    description: doc.description || null,
    type: doc.type || 'browser',
    location: doc.location || null,
    capabilities: doc.capabilities ? doc.capabilities : null,
    status: doc.status || 'active',
    last_active: doc.lastActive || doc.last_active || null,
    assigned_user_id: ownerId,
    allowed_actions: doc.allowed_actions ? doc.allowed_actions : [],
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformCategory(doc) {
  return {
    id: uuidv4(),
    key: doc.key || (doc._id ? doc._id.toString() : uuidv4()),
    label: doc.label || doc.key || 'Unknown',
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformLlmInstance(doc) {
  return {
    id: uuidv4(),
    name: doc.name || 'LLM Instance',
    url: doc.url || '',
    model: doc.model || '',
    enabled: doc.enabled !== undefined ? doc.enabled : true,
    is_active: doc.isActive !== undefined ? doc.isActive : false,
    system_prompt: doc.systemPrompt || doc.system_prompt || null,
    health: doc.health || 'unknown',
    last_health_check: doc.lastHealthCheck || doc.last_health_check || null,
    config: doc.config ? doc.config : null,
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformTranscript(doc) {
  let userId = doc.userId || 'unknown';
  if (userId && mongoose.Types.ObjectId.isValid(userId)) userId = userIdMap.get(userId.toString()) || userId;

  let terminalId = doc.terminalId || null;
  if (terminalId && mongoose.Types.ObjectId.isValid(terminalId)) terminalId = terminalIdMap.get(terminalId.toString()) || terminalId;

  return {
    id: uuidv4(),
    user_id: userId,
    terminal_id: terminalId || null,
    audio_blob_ref: doc.audioBlobRef || doc.audio_blob_ref || null,
    transcript: doc.transcript || '',
    stt_confidence: doc.sttConfidence || doc.stt_confidence || null,
    ai_adjusted_text: doc.aiAdjustedText || doc.ai_adjusted_text || null,
    suggestions: doc.suggestions ? doc.suggestions : null,
    suggestion_flag: doc.suggestionFlag !== undefined ? doc.suggestionFlag : false,
    category: doc.category || null,
    intent: doc.intent ? doc.intent : null,
    is_valid: doc.isValid !== undefined ? doc.isValid : true,
    confidence: doc.confidence || null,
    has_ambiguity: doc.hasAmbiguity !== undefined ? doc.hasAmbiguity : false,
    clarification_needed: doc.clarificationNeeded !== undefined ? doc.clarificationNeeded : false,
    clarification_question: doc.clarificationQuestion || doc.clarification_question || null,
    duration_ms: doc.durationMs || doc.duration_ms || 0,
    timings: doc.timings ? doc.timings : null,
    model: doc.model || 'unknown',
    llm_url: doc.llmUrl || doc.llm_url || null,
    llm_provider: doc.llmProvider || doc.llm_provider || 'lmstudio',
    temperature: doc.temperature || null,
    max_tokens: doc.maxTokens || doc.max_tokens || null,
    raw_response: doc.rawResponse || doc.raw_response ? doc.rawResponse || doc.raw_response : null,
    error: doc.error || null,
    fallback_used: doc.fallbackUsed !== undefined ? doc.fallbackUsed : false,
    assigned_area_id: doc.assignedAreaId || doc.assigned_area_id || null,
    assigned_entity_id: doc.assignedEntityId || doc.assigned_entity_id || null,
    assigned_action: doc.assignedAction || doc.assigned_action ? doc.assignedAction || doc.assigned_action : null,
    assigned_trigger: doc.assignedTrigger || doc.assigned_trigger || null,
    assigned_trigger_at: doc.assignedTriggerAt || doc.assigned_trigger_at || null,
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformIntentLog(doc) {
  let terminalId = doc.terminalId || null;
  if (terminalId && mongoose.Types.ObjectId.isValid(terminalId)) terminalId = terminalIdMap.get(terminalId.toString()) || terminalId;

  return {
    id: uuidv4(),
    timestamp: doc.timestamp || (doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()),
    transcript: doc.transcript || '',
    intent: doc.intent || '',
    summary: doc.summary || null,
    keywords: doc.keywords ? doc.keywords : null,
    confidence: doc.confidence || null,
    terminal_id: terminalId || null,
    created_at: doc.createdAt || doc.created_at || new Date(),
  };
}

/**
 * Migrationsfunktion
 */
async function migrateCollection(mongoDb, mariaConn, migrationConfig) {
  // migrationConfig = { mongo, maria, transformer, mode?, fixedColumns? }
  const collectionName = migrationConfig.mongo;
  const tableName = migrationConfig.maria;
  const transformer = migrationConfig.transformer;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration: ${collectionName} -> ${tableName}`);
  console.log('='.repeat(60));

  const collection = mongoDb.collection(collectionName);
  const total = await collection.countDocuments();

  if (total === 0) {
    console.log(`Collection '${collectionName}' ist leer. Überspringe.`);
    return { collection: collectionName, total: 0, migrated: 0, errors: 0 };
  }

  // get target table columns
  const tableCols = await getTableColumns(mariaConn, tableName);
  const colNames = tableCols.map(c => c.name);
  const hasGeneric = colNames.includes('mongo_id') && colNames.includes('data');

  console.log(`Found ${total} docs in Mongo. Table '${tableName}' columns: ${colNames.join(',')}`);

  const cursor = collection.find().batchSize(BATCH_SIZE);
  let batch = [];
  let processed = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      let row;
      // allow explicit mode overrides
      const mode = migrationConfig.mode || (hasGeneric ? 'generic' : 'structured');
      if (mode === 'generic') {
        // generic schema: id, mongo_id, data, created_at, updated_at
        row = {
          id: uuidv4(),
          mongo_id: doc._id ? doc._id.toString() : null,
          data: JSON.stringify(doc),
          created_at: doc.createdAt || doc.created_at || new Date(),
          updated_at: doc.updatedAt || doc.updated_at || new Date(),
        };
      } else {
        // structured schema - use transformer then adapt to available columns
        const transformed = transformer(doc);
        // build row with only columns present in target table
        row = {};
        for (const k of Object.keys(transformed)) {
          // if migrationConfig specifies fixedColumns, respect that as allowed set
          const allowed = migrationConfig.fixedColumns ? migrationConfig.fixedColumns : colNames;
          if (allowed.includes(k) && colNames.includes(k)) {
            row[k] = transformed[k];
            // convert date strings for datetime columns
            const colMeta = tableCols.find(c => c.name === k);
            if (colMeta && /datetime|timestamp/i.test(colMeta.type) && row[k]) {
              row[k] = formatDatetime(row[k]);
            }
            // JSON columns: ensure objects are stored as JSON strings or left to driver
            if (colMeta && /json/i.test(colMeta.type) && row[k] !== null && row[k] !== undefined) {
              // keep as object - mysql2 will stringify if needed, but to be safe stringify
              try { row[k] = JSON.stringify(row[k]); } catch(e) {}
            }
          }
        }
      }

      // Special-case: intent_logs.timestamp must be converted from ISO to MySQL DATETIME without 'T' and 'Z'
      if (tableName === 'intent_logs' && row.timestamp) {
        row.timestamp = formatDatetime(row.timestamp);
      }

      // Special-case: app_users should not receive an 'id' column; ensure we only insert known columns
      if (tableName === 'app_users') {
        const allowed = ['username','email','password_hash','created_at','updated_at'];
        const filtered = {};
        for (const k of Object.keys(row)) if (allowed.includes(k)) filtered[k] = row[k];
        row = filtered;
      }

      batch.push(row);
    } catch (e) {
      console.error(`Transform error for ${doc._id}:`, e.message);
      errors++;
    }

    if (batch.length >= BATCH_SIZE) {
      try {
        await insertBatch(mariaConn, tableName, batch);
        processed += batch.length;
        console.log(`  migrated ${processed}/${total}`);
      } catch (e) {
        console.error('Batch-Insert error for', tableName, e.message);
        errors += batch.length;
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    try {
      await insertBatch(mariaConn, tableName, batch);
      processed += batch.length;
    } catch (e) {
      console.error('Final batch insert error for', tableName, e.message);
      errors += batch.length;
    }
  }

  console.log(`Completed: ${processed}/${total} (${errors} errors)`);
  return { collection: collectionName, total, migrated: processed, errors };
}

async function insertBatch(conn, tableName, rows) {
  if (rows.length === 0) return;
  // determine columns to insert from first row
  const keys = Object.keys(rows[0]);

  // fetch column meta to adjust values (stringify objects for text-like columns)
  const tableCols = await getTableColumns(conn, tableName);
  const colMetaByName = Object.fromEntries(tableCols.map(c => [c.name, c]));

  // normalize rows: ensure values for all keys exist and stringify objects for text-like columns
  let normalizedRows = rows.map(row => {
    const out = {};
    for (const k of keys) {
      let v = row[k] === undefined ? null : row[k];
      const meta = colMetaByName[k];
      if (meta) {
        const t = meta.type.toLowerCase();
        if ((t.includes('text') || t.includes('longtext') || t.includes('json')) && v !== null && typeof v !== 'string') {
          try { v = JSON.stringify(v); } catch (e) { v = String(v); }
        }
        if ((t.includes('datetime') || t.includes('timestamp')) && v) {
          v = formatDatetime(v);
        }
      }
      out[k] = v;
    }
    return out;
  });

  // If table has mongo_id column, deduplicate rows by mongo_id (keep last occurrence in batch)
  const hasMongoId = tableCols.some(c => c.name === 'mongo_id');
  if (hasMongoId) {
    const seen = new Map();
    for (const r of normalizedRows) {
      const mid = r['mongo_id'] || null;
      if (mid === null) {
        // if no mongo_id, just push with unique temp key
        const temp = Symbol();
        seen.set(temp, r);
      } else {
        // overwrite previous, so last wins
        seen.set(mid, r);
      }
    }
    normalizedRows = Array.from(seen.values());
  }

  const placeholders = normalizedRows.map(() => `(${keys.map(() => '?').join(',')})`).join(',');
  const values = normalizedRows.flatMap(row => keys.map(k => row[k]));

  let sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES ${placeholders}`;
  if (hasMongoId) {
    const updateCols = keys.filter(k => k !== 'mongo_id');
    if (updateCols.length) {
      sql += ' ON DUPLICATE KEY UPDATE ' + updateCols.map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
    }
  }

  try {
    // If table has mongo_id or batch is small, perform single-row upserts to avoid intra-batch duplicate key collisions
    if (hasMongoId || normalizedRows.length <= 10) {
      for (const row of normalizedRows) {
        const rowKeys = Object.keys(row);
        const ph = `(${rowKeys.map(()=>'?').join(',')})`;
        const singleSql = `INSERT INTO \`${tableName}\` (${rowKeys.map(k=>`\`${k}\``).join(',')}) VALUES ${ph}` + (hasMongoId ? (' ON DUPLICATE KEY UPDATE ' + rowKeys.filter(k=>k!=='mongo_id').map(c=>`\`${c}\`=VALUES(\`${c}\`)`).join(',')) : '');
        const vals = rowKeys.map(k=>row[k]);
        try {
          // debug
          console.log(`DEBUG: single insert into ${tableName} keys=${rowKeys.length}`);
          await conn.query(singleSql, vals);
        } catch (err) {
          console.error(`Insert error (single) into ${tableName}:`, err.message);
          console.error('SQL preview:', singleSql.substring(0,300));
          console.error('row sample:', row);
          throw err;
        }
      }
    } else {
      // debug info
      console.log(`DEBUG: batch insert into ${tableName} columns=${keys.length} rows=${normalizedRows.length} values=${values.length}`);
      await conn.query(sql, values);
    }
  } catch (e) {
    console.error(`Insert error into ${tableName}:`, e.message);
    try {
      console.error('SQL preview:', sql.substring(0, 400) + (sql.length > 400 ? '...':'') );
      console.error('keys:', keys);
      console.error('first row sample:', normalizedRows[0]);
    } catch (er) {}
    throw e;
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('Starting migration...');

  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const mongoDb = mongoose.connection.db;
  const mariaConn = await mysql.createConnection(MYSQL_CFG);

  const migrations = [
    // only migrate the previously failed collections to avoid duplicating transcripts
    { mongo: 'users', maria: 'app_users', transformer: transformUser, mode: 'fixed', fixedColumns: ['username','email','password_hash','created_at','updated_at'] },
    { mongo: 'categories', maria: 'categories', transformer: transformCategory, mode: 'generic' },
    { mongo: 'llminstances', maria: 'llminstances', transformer: transformLlmInstance, mode: 'generic' },
    { mongo: 'intentlogs', maria: 'intent_logs', transformer: transformIntentLog, mode: 'fixed', fixedColumns: ['id','transcript','confidence','timestamp','terminal_id','created_at','intent','summary','keywords'] },
  ];

  const results = [];
  for (const migrationEntry of migrations) {
    const res = await migrateCollection(mongoDb, mariaConn, migrationEntry);
    results.push(res);
  }

  console.log('\nSummary:');
  console.table(results);

  await mariaConn.end();
  await mongoose.disconnect();
}

main().catch(e => { console.error('Migration fatal:', e.message); process.exit(1); });
