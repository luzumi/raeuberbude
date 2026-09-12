#!/usr/bin/env ts-node
/**
 * Schema-Validierung für LUD28-62
 *
 * Überprüft, ob alle erforderlichen Tabellen, Indizes und Constraints
 * in MariaDB korrekt implementiert sind.
 *
 * Usage: npm run validate:schema
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../.env') });

interface ValidationResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
}

class SchemaValidator {
  private readonly dataSource: DataSource;
  private readonly results: ValidationResult[] = [];

  constructor() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: process.env.MARIADB_HOST || '127.0.0.1',
      port: Number.parseInt(process.env.MARIADB_PORT || '3307'),
      username: process.env.MARIADB_USER || 'rb_user',
      password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
      database: process.env.MARIADB_DATABASE || 'raueberbude',
    });
  }

  async connect(): Promise<void> {
    await this.dataSource.initialize();
    console.log('✅ Connected to MariaDB\n');
  }

  async disconnect(): Promise<void> {
    await this.dataSource.destroy();
  }

  private addResult(category: string, check: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string): void {
    this.results.push({ category, check, status, details });
  }

  /**
   * Überprüfe, ob alle erforderlichen Tabellen existieren
   */
  async validateTables(): Promise<void> {
    console.log('📋 Validating Tables...\n');

    const requiredTables = [
      // Core Auth & Users
      'users',
      'app_users',
      'userrights',

      // Terminals
      'app_terminals',
      'appterminals',

      // Logging & Speech
      'categories',
      'intent_logs',
      'intentlogs',
      'transcripts',
      'humaninputs',
      'test_inputs',
      'logs',

      // Keywords & Suggestions (LUD28-62 Focus)
      'keywords',
      'suggestions',
      'transcript_keywords',
      'transcript_suggestions',
      'intent_log_keywords',

      // LLM
      'llminstances',

      // Home Assistant
      'ha_areas',
      'ha_devices',
      'ha_entities',
      'ha_entity_states',
      'ha_entity_attributes',
      'ha_persons',
      'ha_snapshots',
      'ha_zones',
      'ha_services',
      'ha_automations',
      'ha_media_players',

      // Migrations
      'migrations',
    ];

    const existingTables = await this.dataSource.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_TYPE = 'BASE TABLE'
    `, [process.env.MARIADB_DATABASE || 'raueberbude']);

    const existingTableNames = new Set(existingTables.map((row: any) => row.TABLE_NAME));

    for (const table of requiredTables) {
      if (existingTableNames.has(table)) {
        this.addResult('Tables', `Table '${table}' exists`, 'PASS');
      } else {
        this.addResult('Tables', `Table '${table}' exists`, 'FAIL', 'Table not found');
      }
    }
  }

  /**
   * Überprüfe Keywords & Suggestions Schema (Hauptfokus LUD28-62)
   */
  async validateKeywordsSuggestionsSchema(): Promise<void> {
    console.log('🔑 Validating Keywords & Suggestions Schema...\n');

    // Keywords table structure
    const keywordsColumns = await this.dataSource.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'keywords'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MARIADB_DATABASE || 'raueberbude']);

    const expectedKeywordsColumns = ['id', 'keyword', 'normalized', 'usage_count', 'created_at'];
    const actualKeywordsColumns = keywordsColumns.map((col: any) => col.COLUMN_NAME);

    if (expectedKeywordsColumns.every(col => actualKeywordsColumns.includes(col))) {
      this.addResult('Keywords Schema', 'All required columns present', 'PASS',
        `Columns: ${actualKeywordsColumns.join(', ')}`);
    } else {
      this.addResult('Keywords Schema', 'All required columns present', 'FAIL',
        `Missing: ${expectedKeywordsColumns.filter(c => !actualKeywordsColumns.includes(c)).join(', ')}`);
    }

    // Suggestions table structure
    const suggestionsColumns = await this.dataSource.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'suggestions'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MARIADB_DATABASE || 'raueberbude']);

    const expectedSuggestionsColumns = ['id', 'suggestion_text', 'text_hash', 'usage_count', 'created_at'];
    const actualSuggestionsColumns = suggestionsColumns.map((col: any) => col.COLUMN_NAME);

    if (expectedSuggestionsColumns.every(col => actualSuggestionsColumns.includes(col))) {
      this.addResult('Suggestions Schema', 'All required columns present', 'PASS',
        `Columns: ${actualSuggestionsColumns.join(', ')}`);
    } else {
      this.addResult('Suggestions Schema', 'All required columns present', 'FAIL',
        `Missing: ${expectedSuggestionsColumns.filter(c => !actualSuggestionsColumns.includes(c)).join(', ')}`);
    }
  }

  /**
   * Überprüfe Indizes
   */
  async validateIndices(): Promise<void> {
    console.log('📊 Validating Indices...\n');

    const expectedIndices = [
      { table: 'keywords', index: 'PRIMARY' },
      { table: 'keywords', index: 'uq_keywords__keyword' },
      { table: 'keywords', index: 'ix_keywords__normalized' },
      { table: 'keywords', index: 'ix_keywords__usage_count' },
      { table: 'suggestions', index: 'PRIMARY' },
      { table: 'suggestions', index: 'uq_suggestions__text_hash' },
      { table: 'suggestions', index: 'ix_suggestions__usage_count' },
      { table: 'transcript_keywords', index: 'PRIMARY' },
      { table: 'transcript_keywords', index: 'ix_transcript_keywords__keyword_id' },
      { table: 'transcript_suggestions', index: 'PRIMARY' },
      { table: 'transcript_suggestions', index: 'ix_transcript_suggestions__suggestion_id' },
      { table: 'intent_log_keywords', index: 'PRIMARY' },
      { table: 'intent_log_keywords', index: 'ix_intent_log_keywords__keyword_id' },
    ];

    for (const { table, index } of expectedIndices) {
      const indices = await this.dataSource.query(`
        SHOW INDEX FROM ${table} WHERE Key_name = ?
      `, [index]);

      if (indices.length > 0) {
        this.addResult('Indices', `Index '${index}' on '${table}'`, 'PASS');
      } else {
        this.addResult('Indices', `Index '${index}' on '${table}'`, 'FAIL', 'Index not found');
      }
    }
  }

  /**
   * Überprüfe Foreign Key Constraints
   */
  async validateForeignKeys(): Promise<void> {
    console.log('🔗 Validating Foreign Keys...\n');

    const expectedForeignKeys = [
      { table: 'transcript_keywords', constraint: 'fk_transcript_keywords__keywords', refTable: 'keywords' },
      { table: 'transcript_keywords', constraint: 'fk_transcript_keywords__transcripts', refTable: 'transcripts' },
      { table: 'transcript_suggestions', constraint: 'fk_transcript_suggestions__suggestions', refTable: 'suggestions' },
      { table: 'transcript_suggestions', constraint: 'fk_transcript_suggestions__transcripts', refTable: 'transcripts' },
      { table: 'intent_log_keywords', constraint: 'fk_intent_log_keywords__keywords', refTable: 'keywords' },
      { table: 'intent_log_keywords', constraint: 'fk_intent_log_keywords__intent_logs', refTable: 'intent_logs' },
    ];

    for (const { table, constraint, refTable } of expectedForeignKeys) {
      const fks = await this.dataSource.query(`
        SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND REFERENCED_TABLE_NAME = ?
      `, [process.env.MARIADB_DATABASE || 'raueberbude', table, constraint, refTable]);

      if (fks.length > 0) {
        this.addResult('Foreign Keys', `FK '${constraint}' on '${table}'`, 'PASS', `References: ${refTable}`);
      } else {
        this.addResult('Foreign Keys', `FK '${constraint}' on '${table}'`, 'FAIL',
          `Expected reference to ${refTable}`);
      }
    }
  }

  /**
   * Überprüfe Character Set & Collation
   */
  async validateCharacterSet(): Promise<void> {
    console.log('🔤 Validating Character Set...\n');

    const tables = await this.dataSource.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('keywords', 'suggestions', 'transcript_keywords', 'transcript_suggestions', 'intent_log_keywords')
    `, [process.env.MARIADB_DATABASE || 'raueberbude']);

    for (const table of tables) {
      if (table.TABLE_COLLATION.startsWith('utf8mb4')) {
        this.addResult('Character Set', `Table '${table.TABLE_NAME}' uses utf8mb4`, 'PASS',
          `Collation: ${table.TABLE_COLLATION}`);
      } else {
        this.addResult('Character Set', `Table '${table.TABLE_NAME}' uses utf8mb4`, 'WARN',
          `Current collation: ${table.TABLE_COLLATION}`);
      }
    }
  }

  /**
   * Überprüfe Migrations-Status
   */
  async validateMigrations(): Promise<void> {
    console.log('🔄 Validating Migrations...\n');

    const migrations = await this.dataSource.query(`
      SELECT id, timestamp, name FROM migrations ORDER BY timestamp
    `);

    if (migrations.length > 0) {
      this.addResult('Migrations', 'Migrations table populated', 'PASS',
        `${migrations.length} migration(s) executed`);

      for (const migration of migrations) {
        this.addResult('Migrations', `Migration '${migration.name}'`, 'PASS',
          `Timestamp: ${migration.timestamp}`);
      }
    } else {
      this.addResult('Migrations', 'Migrations table populated', 'WARN',
        'No migrations found in database');
    }
  }

  /**
   * Drucke Zusammenfassung
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const categories = [...new Set(this.results.map(r => r.category))];

    for (const category of categories) {
      console.log(`\n${category}:`);
      console.log('-'.repeat(80));

      const categoryResults = this.results.filter(r => r.category === category);

      for (const result of categoryResults) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.check}`);

        if (result.details) {
          console.log(`     → ${result.details}`);
        }
      }
    }

    // Statistiken
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(80));
    console.log('📈 STATISTICS');
    console.log('='.repeat(80));
    console.log(`  Total Checks: ${total}`);
    console.log(`  ✅ Passed: ${passCount} (${((passCount / total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failed: ${failCount} (${((failCount / total) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Warnings: ${warnCount} (${((warnCount / total) * 100).toFixed(1)}%)`);
    console.log('='.repeat(80) + '\n');

    if (failCount > 0) {
      console.log('❌ Schema validation FAILED. Please review failures above.\n');
      process.exit(1);
    } else if (warnCount > 0) {
      console.log('⚠️  Schema validation passed with warnings.\n');
      process.exit(0);
    } else {
      console.log('✅ Schema validation PASSED successfully!\n');
      process.exit(0);
    }
  }

  /**
   * Hauptausführung
   */
  async run(): Promise<void> {
    try {
      await this.connect();

      await this.validateTables();
      await this.validateKeywordsSuggestionsSchema();
      await this.validateIndices();
      await this.validateForeignKeys();
      await this.validateCharacterSet();
      await this.validateMigrations();

      this.printSummary();
    } catch (error) {
      console.error('\n❌ Validation failed with error:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Hauptausführung
(async () => {
  console.log('🚀 Starting Schema Validation (LUD28-62)...\n');

  const validator = new SchemaValidator();
  await validator.run();
})();

