#!/usr/bin/env ts-node
/**
 * Validierungsskript für DBM-SCHEMA-05 Datentyp-Konvertierung
 *
 * Prüft ob die migrierten Daten den definierten Konvertierungsregeln entsprechen
 * und keine bösen Überraschungen enthalten.
 *
 * Usage:
 *   npm run validate:data-types
 */

import { DataSource } from 'typeorm';
import * as mongoose from 'mongoose';
import { config } from 'dotenv';

config();

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

class DataTypeValidator {
  private mariaDb: DataSource;
  private mongoDb: typeof mongoose;
  private results: ValidationResult[] = [];

  constructor() {
    this.mariaDb = new DataSource({
      type: 'mysql',
      host: process.env.MARIADB_HOST || '127.0.0.1',
      port: Number.parseInt(process.env.MARIADB_PORT || '3307'),
      username: process.env.MARIADB_USER || 'rb_user',
      password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
      database: process.env.MARIADB_DATABASE || 'raueberbude',
    });
  }

  async connect(): Promise<void> {
    console.log('🔌 Connecting to databases...\n');

    const mongoUri = process.env.MONGO_URI ||
      'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
    await mongoose.connect(mongoUri);
    this.mongoDb = mongoose;

    await this.mariaDb.initialize();
    console.log('✅ Connected to both databases\n');
  }

  async disconnect(): Promise<void> {
    await this.mongoDb.disconnect();
    await this.mariaDb.destroy();
  }

  private addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any): void {
    this.results.push({ check, status, message, details });

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${check}: ${message}`);
    if (details) {
      console.log(`   Details:`, JSON.stringify(details, null, 2));
    }
  }

  // =====================================================================
  // 1. ROW COUNT VALIDATION
  // =====================================================================

  async validateRowCounts(): Promise<void> {
    console.log('\n📊 Validating Row Counts...\n');

    // Transcripts
    try {
      const TranscriptModel = this.mongoDb.model('Transcript', new this.mongoDb.Schema({}, { strict: false }), 'transcripts');
      const mongoCount = await TranscriptModel.countDocuments();

      const [mariaCount] = await this.mariaDb.query('SELECT COUNT(*) as count FROM transcripts');
      const mariaTotal = mariaCount[0].count;

      if (mongoCount === mariaTotal) {
        this.addResult('Transcripts Count', 'PASS', `${mongoCount} rows match`);
      } else {
        this.addResult('Transcripts Count', 'FAIL', `Mismatch: MongoDB=${mongoCount}, MariaDB=${mariaTotal}`);
      }
    } catch (e: any) {
      this.addResult('Transcripts Count', 'FAIL', `Error: ${e.message}`);
    }

    // IntentLogs
    try {
      const IntentLogModel = this.mongoDb.model('IntentLog', new this.mongoDb.Schema({}, { strict: false }), 'intentlogs');
      const mongoCount = await IntentLogModel.countDocuments();

      const [mariaCount] = await this.mariaDb.query('SELECT COUNT(*) as count FROM intent_logs');
      const mariaTotal = mariaCount[0].count;

      if (mongoCount === mariaTotal) {
        this.addResult('IntentLogs Count', 'PASS', `${mongoCount} rows match`);
      } else {
        this.addResult('IntentLogs Count', 'FAIL', `Mismatch: MongoDB=${mongoCount}, MariaDB=${mariaTotal}`);
      }
    } catch (e: any) {
      this.addResult('IntentLogs Count', 'FAIL', `Error: ${e.message}`);
    }
  }

  // =====================================================================
  // 2. DATA TYPE VALIDATION
  // =====================================================================

  async validateDataTypes(): Promise<void> {
    console.log('\n🔍 Validating Data Types...\n');

    // Check confidence values (should be 0-1)
    try {
      const [invalid] = await this.mariaDb.query(
        'SELECT COUNT(*) as count FROM transcripts WHERE confidence IS NOT NULL AND (confidence < 0 OR confidence > 1)'
      );

      if (invalid[0].count === 0) {
        this.addResult('Confidence Range', 'PASS', 'All confidence values in range 0-1');
      } else {
        this.addResult('Confidence Range', 'FAIL', `${invalid[0].count} rows with invalid confidence values`);
      }
    } catch (e: any) {
      this.addResult('Confidence Range', 'FAIL', `Error: ${e.message}`);
    }

    // Check boolean values (should be 0 or 1)
    try {
      const [invalid] = await this.mariaDb.query(
        'SELECT COUNT(*) as count FROM transcripts WHERE is_valid NOT IN (0, 1)'
      );

      if (invalid[0].count === 0) {
        this.addResult('Boolean Values', 'PASS', 'All boolean fields are 0 or 1');
      } else {
        this.addResult('Boolean Values', 'FAIL', `${invalid[0].count} rows with invalid boolean values`);
      }
    } catch (e: any) {
      this.addResult('Boolean Values', 'FAIL', `Error: ${e.message}`);
    }

    // Check dates (should be valid)
    try {
      const [invalid] = await this.mariaDb.query(
        "SELECT COUNT(*) as count FROM transcripts WHERE created_at < '1970-01-01' OR created_at IS NULL"
      );

      if (invalid[0].count === 0) {
        this.addResult('Date Values', 'PASS', 'All dates are valid');
      } else {
        this.addResult('Date Values', 'FAIL', `${invalid[0].count} rows with invalid dates`);
      }
    } catch (e: any) {
      this.addResult('Date Values', 'FAIL', `Error: ${e.message}`);
    }

    // Check JSON validity
    try {
      const [invalid] = await this.mariaDb.query(
        'SELECT COUNT(*) as count FROM transcripts WHERE intent IS NOT NULL AND JSON_VALID(intent) = 0'
      );

      if (invalid[0].count === 0) {
        this.addResult('JSON Validity', 'PASS', 'All JSON fields are valid');
      } else {
        this.addResult('JSON Validity', 'FAIL', `${invalid[0].count} rows with invalid JSON`);
      }
    } catch (e: any) {
      this.addResult('JSON Validity', 'FAIL', `Error: ${e.message}`);
    }
  }

  // =====================================================================
  // 3. NULL CONSTRAINT VALIDATION
  // =====================================================================

  async validateNullConstraints(): Promise<void> {
    console.log('\n🚫 Validating NULL Constraints...\n');

    const requiredFields = [
      { table: 'transcripts', fields: ['user_id', 'transcript', 'is_valid', 'duration_ms', 'model', 'created_at', 'updated_at'] },
      { table: 'intent_logs', fields: ['transcript', 'intent_key', 'created_at'] },
      { table: 'keywords', fields: ['keyword', 'normalized'] },
      { table: 'suggestions', fields: ['suggestion_text', 'text_hash'] },
    ];

    for (const { table, fields } of requiredFields) {
      for (const field of fields) {
        try {
          const [result] = await this.mariaDb.query(
            `SELECT COUNT(*) as count FROM ${table} WHERE ${field} IS NULL`
          );

          if (result[0].count === 0) {
            this.addResult(`${table}.${field}`, 'PASS', 'No NULL values found');
          } else {
            this.addResult(`${table}.${field}`, 'FAIL', `${result[0].count} NULL values in required field`);
          }
        } catch (e: any) {
          this.addResult(`${table}.${field}`, 'FAIL', `Error: ${e.message}`);
        }
      }
    }
  }

  // =====================================================================
  // 4. FOREIGN KEY VALIDATION
  // =====================================================================

  async validateForeignKeys(): Promise<void> {
    console.log('\n🔗 Validating Foreign Keys...\n');

    // Check transcript_keywords references
    try {
      const [orphaned] = await this.mariaDb.query(`
        SELECT COUNT(*) as count
        FROM transcript_keywords tk
        LEFT JOIN transcripts t ON tk.transcript_id = t.id
        WHERE t.id IS NULL
      `);

      if (orphaned[0].count === 0) {
        this.addResult('transcript_keywords → transcripts', 'PASS', 'All FKs valid');
      } else {
        this.addResult('transcript_keywords → transcripts', 'FAIL', `${orphaned[0].count} orphaned records`);
      }
    } catch (e: any) {
      this.addResult('transcript_keywords FK', 'FAIL', `Error: ${e.message}`);
    }

    // Check transcript_keywords → keywords
    try {
      const [orphaned] = await this.mariaDb.query(`
        SELECT COUNT(*) as count
        FROM transcript_keywords tk
        LEFT JOIN keywords k ON tk.keyword_id = k.id
        WHERE k.id IS NULL
      `);

      if (orphaned[0].count === 0) {
        this.addResult('transcript_keywords → keywords', 'PASS', 'All FKs valid');
      } else {
        this.addResult('transcript_keywords → keywords', 'FAIL', `${orphaned[0].count} orphaned records`);
      }
    } catch (e: any) {
      this.addResult('transcript_keywords → keywords FK', 'FAIL', `Error: ${e.message}`);
    }

    // Similar checks for suggestions and intent_log_keywords...
  }

  // =====================================================================
  // 5. UNIQUE CONSTRAINT VALIDATION
  // =====================================================================

  async validateUniqueConstraints(): Promise<void> {
    console.log('\n🔑 Validating UNIQUE Constraints...\n');

    // Check keywords.keyword uniqueness
    try {
      const [dupes] = await this.mariaDb.query(`
        SELECT keyword, COUNT(*) as count
        FROM keywords
        GROUP BY keyword
        HAVING COUNT(*) > 1
      `);

      if (dupes.length === 0) {
        this.addResult('keywords.keyword UNIQUE', 'PASS', 'No duplicates found');
      } else {
        this.addResult('keywords.keyword UNIQUE', 'FAIL', `${dupes.length} duplicates found`, dupes);
      }
    } catch (e: any) {
      this.addResult('keywords UNIQUE', 'FAIL', `Error: ${e.message}`);
    }

    // Check suggestions.text_hash uniqueness
    try {
      const [dupes] = await this.mariaDb.query(`
        SELECT text_hash, COUNT(*) as count
        FROM suggestions
        GROUP BY text_hash
        HAVING COUNT(*) > 1
      `);

      if (dupes.length === 0) {
        this.addResult('suggestions.text_hash UNIQUE', 'PASS', 'No duplicates found');
      } else {
        this.addResult('suggestions.text_hash UNIQUE', 'FAIL', `${dupes.length} duplicates found`);
      }
    } catch (e: any) {
      this.addResult('suggestions UNIQUE', 'FAIL', `Error: ${e.message}`);
    }
  }

  // =====================================================================
  // 6. INDEX VALIDATION
  // =====================================================================

  async validateIndexes(): Promise<void> {
    console.log('\n📇 Validating Indexes...\n');

    const expectedIndexes = [
      { table: 'transcripts', indexes: ['user_id', 'terminal_id', 'model', 'category', 'is_valid', 'created_at'] },
      { table: 'keywords', indexes: ['normalized', 'usage_count'] },
      { table: 'suggestions', indexes: ['text_hash', 'usage_count'] },
      { table: 'transcript_keywords', indexes: ['keyword_id'] },
    ];

    for (const { table, indexes } of expectedIndexes) {
      try {
        const [existingIndexes] = await this.mariaDb.query(`SHOW INDEX FROM ${table}`);
        const indexNames = (existingIndexes as any[]).map(idx => idx.Column_name);

        for (const expectedIndex of indexes) {
          if (indexNames.includes(expectedIndex)) {
            this.addResult(`${table}.${expectedIndex} INDEX`, 'PASS', 'Index exists');
          } else {
            this.addResult(`${table}.${expectedIndex} INDEX`, 'WARN', 'Index missing - may affect performance');
          }
        }
      } catch (e: any) {
        this.addResult(`${table} INDEXES`, 'FAIL', `Error: ${e.message}`);
      }
    }
  }

  // =====================================================================
  // 7. CHARACTER SET VALIDATION
  // =====================================================================

  async validateCharacterSet(): Promise<void> {
    console.log('\n🔤 Validating Character Set & Collation...\n');

    const tables = ['transcripts', 'keywords', 'suggestions', 'transcript_keywords', 'intent_logs'];

    for (const table of tables) {
      try {
        const [info] = await this.mariaDb.query(`
          SELECT TABLE_COLLATION
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [process.env.MARIADB_DATABASE || 'raueberbude', table]);

        const collation = (info as any)[0]?.TABLE_COLLATION;

        if (collation && collation.includes('utf8mb4')) {
          this.addResult(`${table} CHARACTER SET`, 'PASS', `Using ${collation}`);
        } else {
          this.addResult(`${table} CHARACTER SET`, 'WARN', `Not utf8mb4: ${collation}`);
        }
      } catch (e: any) {
        this.addResult(`${table} CHARACTER SET`, 'FAIL', `Error: ${e.message}`);
      }
    }
  }

  // =====================================================================
  // MAIN VALIDATION RUNNER
  // =====================================================================

  async runAllValidations(): Promise<void> {
    try {
      await this.connect();

      await this.validateRowCounts();
      await this.validateDataTypes();
      await this.validateNullConstraints();
      await this.validateForeignKeys();
      await this.validateUniqueConstraints();
      await this.validateIndexes();
      await this.validateCharacterSet();

      this.printSummary();
    } catch (error) {
      console.error('\n❌ Validation failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(70));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;

    console.log(`Total Checks: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warned}`);
    console.log('='.repeat(70));

    if (failed > 0) {
      console.log('\n❌ VALIDATION FAILED - Fix errors before going to production!');
      console.log('\nFailed checks:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.check}: ${r.message}`);
      });
      process.exit(1);
    } else if (warned > 0) {
      console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before production');
    } else {
      console.log('\n✅ ALL VALIDATIONS PASSED - Data migration is clean!');
    }
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting DBM-SCHEMA-05 Data Type Validation...\n');

  const validator = new DataTypeValidator();
  await validator.runAllValidations();
})();

