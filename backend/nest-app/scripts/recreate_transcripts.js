#!/usr/bin/env node
/**
 * Truncate `transcripts` and migrate from MongoDB -> MariaDB (safe, batched)
 */
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

const BATCH = 200;

function formatDatetime(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().replace('T', ' ').replace('Z', '');
  if (typeof val === 'string') return val.replace('T', ' ').replace('Z', '');
  return val;
}

(async () => {
  console.log('Recreate transcripts: connect to DBs');
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const mongoDb = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  try {
    console.log('Truncate table transcripts (disabling FK checks)');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE `transcripts`');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const total = await mongoDb.collection('transcripts').countDocuments();
    console.log('Mongo transcripts total:', total);

    const cursor = mongoDb.collection('transcripts').find().batchSize(BATCH);
    let batchRows = [];
    let migrated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      // transform
      const row = {
        id: uuidv4(),
        mongo_id: doc._id ? doc._id.toString() : null,
        user_id: doc.userId && typeof doc.userId === 'object' ? (doc.userId.toString()) : (doc.userId || null),
        terminal_id: doc.terminalId && typeof doc.terminalId === 'object' ? (doc.terminalId.toString()) : (doc.terminalId || null),
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
        created_at: formatDatetime(doc.createdAt || doc.created_at || new Date()),
        updated_at: formatDatetime(doc.updatedAt || doc.updated_at || new Date()),
      };

      batchRows.push(row);

      if (batchRows.length >= BATCH) {
        // insert batch
        const keys = Object.keys(batchRows[0]);
        const placeholders = batchRows.map(() => `(${keys.map(() => '?').join(',')})`).join(',');
        const values = batchRows.flatMap(r => keys.map(k => r[k]));
        const onDuplicate = ' ON DUPLICATE KEY UPDATE ' + keys.filter(k => k !== 'id').map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(',');
        const sql = `INSERT INTO \`transcripts\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES ${placeholders}` + onDuplicate;
        await conn.query(sql, values);
        migrated += batchRows.length;
        console.log(`Migrated ${migrated}/${total}`);
        batchRows = [];
      }
    }

    if (batchRows.length) {
      const keys = Object.keys(batchRows[0]);
      const placeholders = batchRows.map(() => `(${keys.map(() => '?').join(',')})`).join(',');
      const values = batchRows.flatMap(r => keys.map(k => r[k]));
      const onDuplicate = ' ON DUPLICATE KEY UPDATE ' + keys.filter(k => k !== 'id').map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(',');
      const sql = `INSERT INTO \`transcripts\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES ${placeholders}` + onDuplicate;
      await conn.query(sql, values);
      migrated += batchRows.length;
      console.log(`Migrated ${migrated}/${total}`);
    }

    console.log('Done. Migrated transcripts:', migrated);
  } catch (e) {
    console.error('Error during recreate_transcripts:', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    try { await conn.end(); } catch (_) {}
    try { await mongoose.disconnect(); } catch (_) {}
  }
})();

// Stub: archived recreate_transcripts.js
console.log('recreate_transcripts.js archived. See scripts/archive/original-scripts.json');
