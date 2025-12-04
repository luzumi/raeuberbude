#!/usr/bin/env node
/**
 * Migration Script: MongoDB → MariaDB
 *
 * Dieser Script migriert alle Daten von MongoDB nach MariaDB.
 *
 * Ablauf:
 * 1. Alle Tabellen in MariaDB leeren (außer ha_entities, die werden vom Bootstrap befüllt)
 * 2. Warten auf manuellen App-Neustart (damit HA-Daten in MariaDB eingespielt werden)
 * 3. Nacheinander alle Collections aus MongoDB nach MariaDB übertragen (in FK-Reihenfolge)
 *
 * FK-Reihenfolge:
 * 1. app_users (keine Dependencies)
 * 2. app_terminals (FK zu app_users)
 * 3. categories (keine Dependencies)
 * 4. llm_instances (keine Dependencies)
 * 5. transcripts (FK zu app_users, app_terminals, möglicherweise categories)
 * 6. intent_logs (FK zu app_terminals)
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

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

// Mapping: MongoDB Collection -> MariaDB Table
const MIGRATION_ORDER = [
  { mongo: 'users', maria: 'app_users', transformer: transformUser },
  { mongo: 'app_terminals', maria: 'app_terminals', transformer: transformAppTerminal },
  { mongo: 'categories', maria: 'categories', transformer: transformCategory },
  { mongo: 'llminstances', maria: 'llm_instances', transformer: transformLlmInstance },
  { mongo: 'transcripts', maria: 'transcripts', transformer: transformTranscript },
  { mongo: 'intentlogs', maria: 'intent_logs', transformer: transformIntentLog },
];

// User ID Mapping (MongoDB ObjectId -> MariaDB UUID)
const userIdMap = new Map();
const terminalIdMap = new Map();

/**
 * Hilfsfunktion: User-Eingabe abfragen
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * Transform-Funktionen für jede Collection
 */

function transformUser(doc) {
  const newId = uuidv4();
  const oldId = doc._id.toString();
  userIdMap.set(oldId, newId);

  return {
    id: newId,
    username: doc.username || 'unknown',
    email: doc.email || `user_${oldId}@example.com`,
    password_hash: doc.password_hash || doc.passwordHash || '',
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformAppTerminal(doc) {
  const newId = uuidv4();
  const oldId = doc._id.toString();
  terminalIdMap.set(oldId, newId);

  // Resolve owner_id FK
  let ownerId = null;
  if (doc.ownerId) {
    ownerId = userIdMap.get(doc.ownerId.toString()) || null;
  }

  return {
    id: newId,
    terminal_id: doc.terminalId || doc.terminal_id || oldId,
    name: doc.name || 'Terminal',
    description: doc.description || null,
    type: doc.type || 'browser',
    location: doc.location || null,
    capabilities: doc.capabilities ? JSON.stringify(doc.capabilities) : null,
    status: doc.status || 'active',
    last_active: doc.lastActive || doc.last_active || null,
    owner_id: ownerId,
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformCategory(doc) {
  const newId = uuidv4();

  return {
    id: newId,
    key: doc.key || doc._id.toString(),
    label: doc.label || doc.key || 'Unknown',
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformLlmInstance(doc) {
  const newId = uuidv4();

  return {
    id: newId,
    name: doc.name || 'LLM Instance',
    url: doc.url || '',
    model: doc.model || '',
    enabled: doc.enabled !== undefined ? doc.enabled : true,
    is_active: doc.isActive !== undefined ? doc.isActive : false,
    system_prompt: doc.systemPrompt || doc.system_prompt || '',
    health: doc.health || 'unknown',
    last_health_check: doc.lastHealthCheck || doc.last_health_check || null,
    config: doc.config ? JSON.stringify(doc.config) : null,
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformTranscript(doc) {
  const newId = uuidv4();

  // Resolve user_id FK
  let userId = doc.userId;
  if (doc.userId && mongoose.Types.ObjectId.isValid(doc.userId)) {
    userId = userIdMap.get(doc.userId.toString()) || doc.userId;
  }

  // Resolve terminal_id FK
  let terminalId = doc.terminalId;
  if (doc.terminalId && mongoose.Types.ObjectId.isValid(doc.terminalId)) {
    terminalId = terminalIdMap.get(doc.terminalId.toString()) || doc.terminalId;
  }

  return {
    id: newId,
    user_id: userId || 'unknown',
    terminal_id: terminalId || null,
    audio_blob_ref: doc.audioBlobRef || doc.audio_blob_ref || null,
    transcript: doc.transcript || '',
    stt_confidence: doc.sttConfidence || doc.stt_confidence || null,
    ai_adjusted_text: doc.aiAdjustedText || doc.ai_adjusted_text || null,
    suggestions: doc.suggestions ? JSON.stringify(doc.suggestions) : null,
    suggestion_flag: doc.suggestionFlag !== undefined ? doc.suggestionFlag : false,
    category: doc.category || null,
    intent: doc.intent ? JSON.stringify(doc.intent) : null,
    is_valid: doc.isValid !== undefined ? doc.isValid : true,
    confidence: doc.confidence || null,
    has_ambiguity: doc.hasAmbiguity !== undefined ? doc.hasAmbiguity : false,
    clarification_needed: doc.clarificationNeeded !== undefined ? doc.clarificationNeeded : false,
    clarification_question: doc.clarificationQuestion || doc.clarification_question || null,
    duration_ms: doc.durationMs || doc.duration_ms || 0,
    timings: doc.timings ? JSON.stringify(doc.timings) : null,
    model: doc.model || 'unknown',
    llm_url: doc.llmUrl || doc.llm_url || null,
    llm_provider: doc.llmProvider || doc.llm_provider || 'lmstudio',
    temperature: doc.temperature || null,
    max_tokens: doc.maxTokens || doc.max_tokens || null,
    raw_response: doc.rawResponse || doc.raw_response ? JSON.stringify(doc.rawResponse || doc.raw_response) : null,
    error: doc.error || null,
    fallback_used: doc.fallbackUsed !== undefined ? doc.fallbackUsed : false,
    assigned_area_id: doc.assignedAreaId || doc.assigned_area_id || null,
    assigned_entity_id: doc.assignedEntityId || doc.assigned_entity_id || null,
    assigned_action: doc.assignedAction || doc.assigned_action ? JSON.stringify(doc.assignedAction || doc.assigned_action) : null,
    assigned_trigger: doc.assignedTrigger || doc.assigned_trigger || null,
    assigned_trigger_at: doc.assignedTriggerAt || doc.assigned_trigger_at || null,
    created_at: doc.createdAt || doc.created_at || new Date(),
    updated_at: doc.updatedAt || doc.updated_at || new Date(),
  };
}

function transformIntentLog(doc) {
  const newId = uuidv4();

  // Resolve terminal_id FK
  let terminalId = doc.terminalId;
  if (doc.terminalId && mongoose.Types.ObjectId.isValid(doc.terminalId)) {
    terminalId = terminalIdMap.get(doc.terminalId.toString()) || doc.terminalId;
  }

  return {
    id: newId,
    transcript: doc.transcript || '',
    confidence: doc.confidence || null,
    timestamp: doc.timestamp || (doc.createdAt?doc.createdAt.toISOString():new Date().toISOString()),
    terminal_id: terminalId || null,
    created_at: doc.createdAt || doc.created_at || new Date(),
    intent: doc.intent || '',
    summary: doc.summary || null,
    keywords: doc.keywords ? JSON.stringify(doc.keywords) : null,
  };
}

(async ()=>{
  console.log('Starting migration script');
  const conn = await mysql.createConnection(MYSQL_CFG);
  await mongoose.connect(MONGO_URI, { autoIndex:false });
  const db = mongoose.connection.db;

  try {
    for (const entry of MIGRATION_ORDER) {
      console.log(`Migrating ${entry.mongo} -> ${entry.maria}`);
      const coll = db.collection(entry.mongo);
      const total = await coll.countDocuments();
      console.log('Documents in Mongo:', total);

      if (total === 0) continue;

      const cursor = coll.find().batchSize(BATCH_SIZE);
      const batch = [];
      let inserted = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const row = entry.transformer(doc);
        const keys = Object.keys(row);
        const placeholders = `(${keys.map(()=>'?').join(',')})`;
        batch.push(keys.map(k=>row[k]));

        if (batch.length >= BATCH_SIZE) {
          const insertSQL = `INSERT INTO \`${entry.maria}\` (${keys.map(k=>`\`${k}\``).join(',')}) VALUES ?`;
          await conn.query(insertSQL, [batch]);
          inserted += batch.length;
          console.log('Inserted', inserted);
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        const keys = Object.keys(entry.transformer({}));
        const insertSQL = `INSERT INTO \`${entry.maria}\` (${keys.map(k=>`\`${k}\``).join(',')}) VALUES ?`;
        await conn.query(insertSQL, [batch]);
        inserted += batch.length;
      }

      console.log(`Finished migrating ${entry.mongo} -> ${entry.maria}, total inserted: ${inserted}`);
    }

    console.log('Migration complete');
  } catch (e) {
    console.error('Migration failed:', e && e.message ? e.message : e);
  } finally {
    await conn.end();
    await mongoose.disconnect();
  }
})();

