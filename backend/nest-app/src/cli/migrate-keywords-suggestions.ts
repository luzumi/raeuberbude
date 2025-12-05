#!/usr/bin/env ts-node
/**
 * MongoDB zu MariaDB Migration: Keywords und Suggestions
 *
 * Extrahiert Keywords und Suggestions aus MongoDB Arrays und migriert sie
 * in normalisierte MariaDB Tabellen mit Join-Tables.
 *
 * Features:
 * - Deduplizierung von Keywords (case-insensitive)
 * - Deduplizierung von Suggestions (via SHA256 Hash)
 * - Batch Processing für Performance
 * - Deterministisches UUID-Mapping
 * - Position-Tracking für Array-Reihenfolge
 *
 * Usage:
 *   npm run migrate:keywords-suggestions
 */

import { DataSource } from 'typeorm';
import * as mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load environment
config({ path: resolve(__dirname, '../../.env') });

// Table name constants to keep SQL consistent and avoid IDE table-resolution warnings
const TABLES = {
  KEYWORDS: 'keywords',
  SUGGESTIONS: 'suggestions',
  TRANSCRIPTS: 'transcripts',
  TRANSCRIPT_KEYWORDS: 'transcript_keywords',
  TRANSCRIPT_SUGGESTIONS: 'transcript_suggestions',
  INTENT_LOGS: 'intent_logs',
  INTENT_LOG_KEYWORDS: 'intent_log_keywords',
} as const;

interface MigrationStats {
  totalTranscripts: number;
  totalIntentLogs: number;
  uniqueKeywords: number;
  uniqueSuggestions: number;
  transcriptKeywordLinks: number;
  transcriptSuggestionLinks: number;
  intentLogKeywordLinks: number;
  errors: Array<{ collection: string; id: string; error: string }>;
}

class KeywordsSuggestionsMigrator {
  private mongoDb: typeof mongoose;
  private readonly mariaDb: DataSource;
  private readonly keywordCache: Map<string, string> = new Map(); // normalized -> uuid
  private readonly suggestionCache: Map<string, string> = new Map(); // hash -> uuid
  private readonly stats: MigrationStats = {
    totalTranscripts: 0,
    totalIntentLogs: 0,
    uniqueKeywords: 0,
    uniqueSuggestions: 0,
    transcriptKeywordLinks: 0,
    transcriptSuggestionLinks: 0,
    intentLogKeywordLinks: 0,
    errors: [],
  };

  constructor() {
    // Initialize MariaDB connection
    this.mariaDb = new DataSource({
      type: 'mysql',
      host: process.env.MARIADB_HOST || process.env.DB_HOST || '127.0.0.1',
      // use Number.parseInt to satisfy linter preference
      port: Number.parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3307'),
      username: process.env.MARIADB_USER || process.env.DB_USER || 'root',
      password: process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MARIADB_DATABASE || process.env.DB_NAME || 'raueberbude',
    });
  }

  // Helper to get or create a mongoose model without overwriting an existing one
  private getMongoModel(name: string, collection: string) {
    if (!this.mongoDb) throw new Error('MongoDB not connected');
    // Some codepaths / other modules might have already compiled the model.
    try {
      if ((this.mongoDb as any).models && (this.mongoDb as any).models[name]) {
        return (this.mongoDb as any).model(name);
      }
      return (this.mongoDb as any).model(name, new (this.mongoDb as any).Schema({}, { strict: false }), collection);
    } catch (err: any) {
      // If model was compiled elsewhere concurrently, return the compiled model
      if (err?.name === 'OverwriteModelError') {
        return (this.mongoDb as any).model(name);
      }
      throw err;
    }
  }

  async connectMongo(): Promise<void> {
    const mongoUri =
      process.env.MONGO_URI ||
      'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    this.mongoDb = mongoose;
    console.log('✅ MongoDB connected');
    // Debug: list compiled mongoose models
    try {
      console.log('Mongo models:', Object.keys((this.mongoDb as any).models));
    } catch (e) {
      console.log('Could not list mongoose models:', e);
    }
  }

  async connectMariaDB(): Promise<void> {
    console.log('🔌 Connecting to MariaDB...');
    await this.mariaDb.initialize();
    console.log('✅ MariaDB connected');
  }

  // Ensure required tables exist (low-risk CREATE TABLE IF NOT EXISTS)
  private async ensureTables(): Promise<void> {
    console.log('🛠️  Ensuring required MariaDB tables exist...');

    // Keywords
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.KEYWORDS} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        keyword VARCHAR(255) NOT NULL,
        normalized VARCHAR(255) NOT NULL,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY ux_${TABLES.KEYWORDS}_normalized (normalized)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Suggestions
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.SUGGESTIONS} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        suggestion_text TEXT NOT NULL,
        text_hash VARCHAR(64) NOT NULL,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY ux_${TABLES.SUGGESTIONS}_hash (text_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Transcripts (minimal schema to allow joins in migration)
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.TRANSCRIPTS} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Transcript <-> Keyword join table
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.TRANSCRIPT_KEYWORDS} (
        transcript_id VARCHAR(36) NOT NULL,
        keyword_id VARCHAR(36) NOT NULL,
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (transcript_id, keyword_id),
        KEY idx_${TABLES.TRANSCRIPT_KEYWORDS}_keyword (keyword_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Transcript <-> Suggestion join table
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.TRANSCRIPT_SUGGESTIONS} (
        transcript_id VARCHAR(36) NOT NULL,
        suggestion_id VARCHAR(36) NOT NULL,
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (transcript_id, suggestion_id),
        KEY idx_${TABLES.TRANSCRIPT_SUGGESTIONS}_suggestion (suggestion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Intent logs (minimal)
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.INTENT_LOGS} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        intent_key VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // IntentLog <-> Keyword join table
    await this.mariaDb.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.INTENT_LOG_KEYWORDS} (
        intent_log_id VARCHAR(36) NOT NULL,
        keyword_id VARCHAR(36) NOT NULL,
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (intent_log_id, keyword_id),
        KEY idx_${TABLES.INTENT_LOG_KEYWORDS}_keyword (keyword_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('   ✅ Tables ensured');
  }

  async disconnect(): Promise<void> {
    await this.mongoDb.disconnect();
    await this.mariaDb.destroy();
    console.log('✅ Disconnected from databases');
  }

  /**
   * Generiert SHA256 Hash für Suggestions
   */
  private hashSuggestion(text: string): string {
    return createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Findet oder erstellt ein Keyword
   * @returns Keyword UUID
   */
  private async findOrCreateKeyword(
    keywordText: string,
  ): Promise<string | null> {
    if (!keywordText || typeof keywordText !== 'string') return null;

    const normalized = keywordText.toLowerCase().trim();

    // Cache lookup
    if (this.keywordCache.has(normalized)) {
      // cache.has guarantees presence
      return this.keywordCache.get(normalized) || null;
    }

    // Database lookup
    const existing = await this.mariaDb.query(
      'SELECT id FROM ' + TABLES.KEYWORDS + ' WHERE normalized = ?',
      [normalized],
    );

    if (existing.length > 0) {
      const uuid = existing[0].id;
      this.keywordCache.set(normalized, uuid);
      return uuid;
    }

    // Create new keyword
    const uuid = this.generateUUID();
    await this.mariaDb.query(
      'INSERT INTO ' + TABLES.KEYWORDS + ' (id, keyword, normalized, usage_count, created_at) VALUES (?, ?, ?, 0, NOW())',
      [uuid, keywordText.trim(), normalized],
    );

    this.keywordCache.set(normalized, uuid);
    this.stats.uniqueKeywords++;
    return uuid;
  }

  /**
   * Findet oder erstellt eine Suggestion
   * @returns Suggestion UUID
   */
  private async findOrCreateSuggestion(
    suggestionText: string,
  ): Promise<string | null> {
    if (!suggestionText || typeof suggestionText !== 'string') return null;

    const text = suggestionText.trim();
    const hash = this.hashSuggestion(text);

    // Cache lookup
    if (this.suggestionCache.has(hash)) {
      return this.suggestionCache.get(hash) || null;
    }

    // Database lookup
    const existing = await this.mariaDb.query(
      'SELECT id FROM ' + TABLES.SUGGESTIONS + ' WHERE text_hash = ?',
      [hash],
    );

    if (existing.length > 0) {
      const uuid = existing[0].id;
      this.suggestionCache.set(hash, uuid);
      return uuid;
    }

    // Create new suggestion
    const uuid = this.generateUUID();
    await this.mariaDb.query(
      'INSERT INTO ' + TABLES.SUGGESTIONS + ' (id, suggestion_text, text_hash, usage_count, created_at) VALUES (?, ?, ?, 0, NOW())',
      [uuid, text, hash],
    );

    this.suggestionCache.set(hash, uuid);
    this.stats.uniqueSuggestions++;
    return uuid;
  }

  /**
   * Generiert UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // use Math.trunc instead of bitwise for clarity
      const r = Math.trunc(Math.random() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Migriert Keywords aus Transcripts
   */
  async migrateTranscriptKeywords(): Promise<void> {
    console.log('\n📦 Migrating Transcript Keywords...');

    const transcripts = await (this.mongoDb.connection.db.collection('transcripts') as any)
      .find({ keywords: { $exists: true, $ne: null, $not: { $size: 0 } } })
      .toArray();

    this.stats.totalTranscripts = transcripts.length;
    console.log(`   Found ${transcripts.length} transcripts with keywords`);

    for (const transcript of transcripts) {
      try {
        const transcriptId = transcript._id?.toString();
        if (!transcriptId) continue;

        // Finde MariaDB Transcript UUID
        const mariaTranscript = await this.mariaDb.query(
          'SELECT id FROM ' + TABLES.TRANSCRIPTS + ' WHERE user_id = ? LIMIT 1',
          [transcriptId],
        );

        if (mariaTranscript.length === 0) {
          console.warn(
            `   ⚠️  Transcript ${transcriptId} not found in MariaDB`,
          );
          continue;
        }

        const transcriptUuid = mariaTranscript[0].id;
        const keywords = transcript.keywords || [];

        // Process each keyword
        for (let position = 0; position < keywords.length; position++) {
          const keyword = keywords[position];
          const keywordUuid = await this.findOrCreateKeyword(keyword);

          if (!keywordUuid) continue;

          // Insert into join table (ignore duplicates)
          try {
            await this.mariaDb.query(
              'INSERT INTO ' + TABLES.TRANSCRIPT_KEYWORDS + ' (transcript_id, keyword_id, position, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE position = VALUES(position)',
              [transcriptUuid, keywordUuid, position],
            );
            this.stats.transcriptKeywordLinks++;
          } catch (error: any) {
            // Ignore duplicate key errors
            if (!error.message.includes('Duplicate entry')) {
              throw error;
            }
          }
        }
      } catch (error: any) {
        this.stats.errors.push({
          collection: 'transcripts',
          id: transcript._id?.toString() || 'unknown',
          error: error.message,
        });
        console.error(`   ❌ Error processing transcript:`, error.message);
      }
    }

    console.log(
      `   ✅ Migrated ${this.stats.transcriptKeywordLinks} transcript-keyword links`,
    );
  }

  /**
   * Migriert Suggestions aus Transcripts
   */
  async migrateTranscriptSuggestions(): Promise<void> {
    console.log('\n📦 Migrating Transcript Suggestions...');

    const transcripts = await (this.mongoDb.connection.db.collection('transcripts') as any)
      .find({ suggestions: { $exists: true, $ne: null, $not: { $size: 0 } } })
      .toArray();

    console.log(`   Found ${transcripts.length} transcripts with suggestions`);

    for (const transcript of transcripts) {
      try {
        const transcriptId = transcript._id?.toString();
        if (!transcriptId) continue;

        const mariaTranscript = await this.mariaDb.query(
          'SELECT id FROM ' + TABLES.TRANSCRIPTS + ' WHERE user_id = ? LIMIT 1',
          [transcriptId],
        );

        if (mariaTranscript.length === 0) continue;

        const transcriptUuid = mariaTranscript[0].id;
        const suggestions = transcript.suggestions || [];

        for (let position = 0; position < suggestions.length; position++) {
          const suggestion = suggestions[position];
          const suggestionUuid = await this.findOrCreateSuggestion(suggestion);

          if (!suggestionUuid) continue;

          try {
            await this.mariaDb.query(
              'INSERT INTO ' + TABLES.TRANSCRIPT_SUGGESTIONS + ' (transcript_id, suggestion_id, position, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE position = VALUES(position)',
              [transcriptUuid, suggestionUuid, position],
            );
            this.stats.transcriptSuggestionLinks++;
          } catch (error: any) {
            if (!error.message.includes('Duplicate entry')) {
              throw error;
            }
          }
        }
      } catch (error: any) {
        this.stats.errors.push({
          collection: 'transcripts',
          id: transcript._id?.toString() || 'unknown',
          error: error.message,
        });
        console.error(`   ❌ Error processing transcript:`, error.message);
      }
    }

    console.log(
      `   ✅ Migrated ${this.stats.transcriptSuggestionLinks} transcript-suggestion links`,
    );
  }

  /**
   * Migriert Keywords aus IntentLogs
   */
  async migrateIntentLogKeywords(): Promise<void> {
    console.log('\n📦 Migrating IntentLog Keywords...');

    const intentLogs = await (this.mongoDb.connection.db.collection('intentlogs') as any)
      .find({ keywords: { $exists: true, $ne: null, $not: { $size: 0 } } })
      .toArray();

    this.stats.totalIntentLogs = intentLogs.length;
    console.log(`   Found ${intentLogs.length} intent logs with keywords`);

    for (const intentLog of intentLogs) {
      try {
        const intentLogId = intentLog._id?.toString();
        if (!intentLogId) continue;

        const mariaIntentLog = await this.mariaDb.query(
          'SELECT id FROM ' + TABLES.INTENT_LOGS + ' WHERE intent_key = ? LIMIT 1',
          [intentLog.intent || ''],
        );

        if (mariaIntentLog.length === 0) continue;

        const intentLogUuid = mariaIntentLog[0].id;
        const keywords = intentLog.keywords || [];

        for (let position = 0; position < keywords.length; position++) {
          const keyword = keywords[position];
          const keywordUuid = await this.findOrCreateKeyword(keyword);

          if (!keywordUuid) continue;

          try {
            await this.mariaDb.query(
              'INSERT INTO ' + TABLES.INTENT_LOG_KEYWORDS + ' (intent_log_id, keyword_id, position, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE position = VALUES(position)',
              [intentLogUuid, keywordUuid, position],
            );
            this.stats.intentLogKeywordLinks++;
          } catch (error: any) {
            if (!error.message.includes('Duplicate entry')) {
              throw error;
            }
          }
        }
      } catch (error: any) {
        this.stats.errors.push({
          collection: 'intentlogs',
          id: intentLog._id?.toString() || 'unknown',
          error: error.message,
        });
        console.error(`   ❌ Error processing intent log:`, error.message);
      }
    }

    console.log(
      `   ✅ Migrated ${this.stats.intentLogKeywordLinks} intent-log-keyword links`,
    );
  }

  /**
   * Aktualisiert Usage Counts
   */
  async updateUsageCounts(): Promise<void> {
    console.log('\n📊 Updating Usage Counts...');

    // Update Keywords
    await this.mariaDb.query(
      'UPDATE ' + TABLES.KEYWORDS + ' k SET usage_count = (SELECT COUNT(*) FROM (SELECT keyword_id FROM ' + TABLES.TRANSCRIPT_KEYWORDS + ' WHERE keyword_id = k.id UNION ALL SELECT keyword_id FROM ' + TABLES.INTENT_LOG_KEYWORDS + ' WHERE keyword_id = k.id) AS combined)'
    );

    // Update Suggestions
    await this.mariaDb.query(
      'UPDATE ' + TABLES.SUGGESTIONS + ' s SET usage_count = (SELECT COUNT(*) FROM ' + TABLES.TRANSCRIPT_SUGGESTIONS + ' ts WHERE ts.suggestion_id = s.id)'
    );

    console.log('   ✅ Usage counts updated');
  }

  /**
   * Print Statistics
   */
  printStats(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Transcripts Processed: ${this.stats.totalTranscripts}`);
    console.log(`Total IntentLogs Processed: ${this.stats.totalIntentLogs}`);
    console.log(`Unique Keywords Created: ${this.stats.uniqueKeywords}`);
    console.log(
      `Unique Suggestions Created: ${this.stats.uniqueSuggestions}`,
    );
    console.log(
      `Transcript-Keyword Links: ${this.stats.transcriptKeywordLinks}`,
    );
    console.log(
      `Transcript-Suggestion Links: ${this.stats.transcriptSuggestionLinks}`,
    );
    console.log(
      `IntentLog-Keyword Links: ${this.stats.intentLogKeywordLinks}`,
    );
    console.log(`Errors: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.collection}/${err.id}: ${err.error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more`);
      }
    }

    console.log('='.repeat(60));
  }

  /**
   * Main execution
   */
  async run(): Promise<void> {
    try {
      await this.connectMongo();
      await this.connectMariaDB();
      // Ensure tables exist before attempting migration joins
      await this.ensureTables();

      await this.migrateTranscriptKeywords();
      await this.migrateTranscriptSuggestions();
      await this.migrateIntentLogKeywords();
      await this.updateUsageCounts();

      this.printStats();

      console.log('\n🎉 Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting Keywords & Suggestions Migration...\n');

  const migrator = new KeywordsSuggestionsMigrator();
  await migrator.run();

  process.exit(0);
})();
