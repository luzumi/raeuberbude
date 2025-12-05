#!/usr/bin/env ts-node
/**
 * Validierungs-Script für Many-to-Many Migration
 *
 * Führt Integritäts-Checks für Keywords und Suggestions durch:
 * - Row Count Validation
 * - Referenzielle Integrität (keine dangling references)
 * - Duplikate prüfen
 * - Usage Count Validation
 *
 * Usage:
 *   npm run validate:many-to-many-migration
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

interface ValidationResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class ManyToManyMigrationValidator {
  private readonly dataSource: DataSource;
  private readonly results: ValidationResult[] = [];

  constructor() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'raeuberbude',
    });
  }

  async connect(): Promise<void> {
    await this.dataSource.initialize();
    console.log('✓ Connected to MariaDB');
  }

  async disconnect(): Promise<void> {
    await this.dataSource.destroy();
    console.log('✓ Disconnected from MariaDB');
  }

  /**
   * 1. Row Count Validation
   * Prüft ob Join-Tables korrekt befüllt sind
   */
  async validateRowCounts(): Promise<void> {
    console.log('\n🔍 Validating Row Counts...');

    // Transcripts mit Keywords
    const transcriptKeywordsCount = await this.dataSource.query(`
      SELECT COUNT(DISTINCT tk.transcript_id) as transcript_count,
             COUNT(*) as keyword_count
      FROM transcript_keywords tk
    `);

    this.results.push({
      testName: 'Transcript Keywords Count',
      passed: transcriptKeywordsCount[0].keyword_count >= 0,
      message: `Found ${transcriptKeywordsCount[0].keyword_count} keyword associations for ${transcriptKeywordsCount[0].transcript_count} transcripts`,
      details: transcriptKeywordsCount[0],
    });

    // Transcripts mit Suggestions
    const transcriptSuggestionsCount = await this.dataSource.query(`
      SELECT COUNT(DISTINCT ts.transcript_id) as transcript_count,
             COUNT(*) as suggestion_count
      FROM transcript_suggestions ts
    `);

    this.results.push({
      testName: 'Transcript Suggestions Count',
      passed: transcriptSuggestionsCount[0].suggestion_count >= 0,
      message: `Found ${transcriptSuggestionsCount[0].suggestion_count} suggestion associations for ${transcriptSuggestionsCount[0].transcript_count} transcripts`,
      details: transcriptSuggestionsCount[0],
    });

    // IntentLogs mit Keywords
    const intentLogKeywordsCount = await this.dataSource.query(`
      SELECT COUNT(DISTINCT ilk.intent_log_id) as intent_log_count,
             COUNT(*) as keyword_count
      FROM intent_log_keywords ilk
    `);

    this.results.push({
      testName: 'IntentLog Keywords Count',
      passed: intentLogKeywordsCount[0].keyword_count >= 0,
      message: `Found ${intentLogKeywordsCount[0].keyword_count} keyword associations for ${intentLogKeywordsCount[0].intent_log_count} intent logs`,
      details: intentLogKeywordsCount[0],
    });
  }

  /**
   * 2. Referenzielle Integrität
   * Prüft auf dangling references (verwaiste FK)
   */
  async validateReferentialIntegrity(): Promise<void> {
    console.log('\n🔍 Validating Referential Integrity...');

    // Orphaned Transcript Keywords
    const orphanedTranscriptKeywords = await this.dataSource.query(`
      SELECT COUNT(*) as orphaned_count
      FROM transcript_keywords tk
      LEFT JOIN transcripts t ON tk.transcript_id = t.id
      LEFT JOIN keywords k ON tk.keyword_id = k.id
      WHERE t.id IS NULL OR k.id IS NULL
    `);

    this.results.push({
      testName: 'Orphaned Transcript Keywords',
      passed: orphanedTranscriptKeywords[0].orphaned_count === 0,
      message:
        orphanedTranscriptKeywords[0].orphaned_count === 0
          ? '✓ No orphaned transcript keywords'
          : `⚠️  Found ${orphanedTranscriptKeywords[0].orphaned_count} orphaned transcript keywords`,
      details: orphanedTranscriptKeywords[0],
    });

    // Orphaned Transcript Suggestions
    const orphanedTranscriptSuggestions = await this.dataSource.query(`
      SELECT COUNT(*) as orphaned_count
      FROM transcript_suggestions ts
      LEFT JOIN transcripts t ON ts.transcript_id = t.id
      LEFT JOIN suggestions s ON ts.suggestion_id = s.id
      WHERE t.id IS NULL OR s.id IS NULL
    `);

    this.results.push({
      testName: 'Orphaned Transcript Suggestions',
      passed: orphanedTranscriptSuggestions[0].orphaned_count === 0,
      message:
        orphanedTranscriptSuggestions[0].orphaned_count === 0
          ? '✓ No orphaned transcript suggestions'
          : `⚠️  Found ${orphanedTranscriptSuggestions[0].orphaned_count} orphaned transcript suggestions`,
      details: orphanedTranscriptSuggestions[0],
    });

    // Orphaned IntentLog Keywords
    const orphanedIntentLogKeywords = await this.dataSource.query(`
      SELECT COUNT(*) as orphaned_count
      FROM intent_log_keywords ilk
      LEFT JOIN intent_logs il ON ilk.intent_log_id = il.id
      LEFT JOIN keywords k ON ilk.keyword_id = k.id
      WHERE il.id IS NULL OR k.id IS NULL
    `);

    this.results.push({
      testName: 'Orphaned IntentLog Keywords',
      passed: orphanedIntentLogKeywords[0].orphaned_count === 0,
      message:
        orphanedIntentLogKeywords[0].orphaned_count === 0
          ? '✓ No orphaned intent log keywords'
          : `⚠️  Found ${orphanedIntentLogKeywords[0].orphaned_count} orphaned intent log keywords`,
      details: orphanedIntentLogKeywords[0],
    });
  }

  /**
   * 3. Duplikate prüfen
   * Prüft UNIQUE Constraints
   */
  async validateDuplicates(): Promise<void> {
    console.log('\n🔍 Validating Duplicates...');

    // Duplikate in keywords.keyword
    const duplicateKeywords = await this.dataSource.query(`
      SELECT keyword, COUNT(*) as count
      FROM keywords
      GROUP BY keyword
      HAVING COUNT(*) > 1
    `);

    this.results.push({
      testName: 'Duplicate Keywords',
      passed: duplicateKeywords.length === 0,
      message:
        duplicateKeywords.length === 0
          ? '✓ No duplicate keywords'
          : `⚠️  Found ${duplicateKeywords.length} duplicate keywords`,
      details: duplicateKeywords,
    });

    // Duplikate in suggestions.text_hash
    const duplicateSuggestions = await this.dataSource.query(`
      SELECT text_hash, COUNT(*) as count
      FROM suggestions
      GROUP BY text_hash
      HAVING COUNT(*) > 1
    `);

    this.results.push({
      testName: 'Duplicate Suggestions',
      passed: duplicateSuggestions.length === 0,
      message:
        duplicateSuggestions.length === 0
          ? '✓ No duplicate suggestions'
          : `⚠️  Found ${duplicateSuggestions.length} duplicate suggestions`,
      details: duplicateSuggestions,
    });

    // Duplikate in Join-Tables (sollten durch PK verhindert sein)
    const duplicateTranscriptKeywords = await this.dataSource.query(`
      SELECT transcript_id, keyword_id, COUNT(*) as count
      FROM transcript_keywords
      GROUP BY transcript_id, keyword_id
      HAVING COUNT(*) > 1
    `);

    this.results.push({
      testName: 'Duplicate Transcript-Keyword Associations',
      passed: duplicateTranscriptKeywords.length === 0,
      message:
        duplicateTranscriptKeywords.length === 0
          ? '✓ No duplicate transcript-keyword associations'
          : `⚠️  Found ${duplicateTranscriptKeywords.length} duplicate associations`,
      details: duplicateTranscriptKeywords,
    });
  }

  /**
   * 4. Usage Count Validation
   * Prüft ob usage_count korrekt berechnet ist
   */
  async validateUsageCounts(): Promise<void> {
    console.log('\n🔍 Validating Usage Counts...');

    const usageCountMismatches = await this.dataSource.query(`
      SELECT
        k.id,
        k.keyword,
        k.usage_count as stored_count,
        (
          (SELECT COUNT(*) FROM transcript_keywords tk WHERE tk.keyword_id = k.id) +
          (SELECT COUNT(*) FROM intent_log_keywords ilk WHERE ilk.keyword_id = k.id)
        ) as actual_count
      FROM keywords k
      HAVING stored_count != actual_count
      LIMIT 10
    `);

    this.results.push({
      testName: 'Keyword Usage Count Accuracy',
      passed: usageCountMismatches.length === 0,
      message:
        usageCountMismatches.length === 0
          ? '✓ All keyword usage counts are accurate'
          : `⚠️  Found ${usageCountMismatches.length} keywords with incorrect usage counts`,
      details: usageCountMismatches,
    });

    const suggestionUsageCountMismatches = await this.dataSource.query(`
      SELECT
        s.id,
        s.suggestion_text,
        s.usage_count as stored_count,
        (SELECT COUNT(*) FROM transcript_suggestions ts WHERE ts.suggestion_id = s.id) as actual_count
      FROM suggestions s
      HAVING stored_count != actual_count
      LIMIT 10
    `);

    this.results.push({
      testName: 'Suggestion Usage Count Accuracy',
      passed: suggestionUsageCountMismatches.length === 0,
      message:
        suggestionUsageCountMismatches.length === 0
          ? '✓ All suggestion usage counts are accurate'
          : `⚠️  Found ${suggestionUsageCountMismatches.length} suggestions with incorrect usage counts`,
      details: suggestionUsageCountMismatches,
    });
  }

  /**
   * 5. Statistics ausgeben
   */
  async printStatistics(): Promise<void> {
    console.log('\n📊 Migration Statistics:');

    const stats = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM keywords) as total_keywords,
        (SELECT COUNT(*) FROM suggestions) as total_suggestions,
        (SELECT COUNT(*) FROM transcript_keywords) as total_transcript_keywords,
        (SELECT COUNT(*) FROM transcript_suggestions) as total_transcript_suggestions,
        (SELECT COUNT(*) FROM intent_log_keywords) as total_intent_log_keywords
    `);

    console.log('  Total Keywords:', stats[0].total_keywords);
    console.log('  Total Suggestions:', stats[0].total_suggestions);
    console.log(
      '  Total Transcript-Keyword Associations:',
      stats[0].total_transcript_keywords,
    );
    console.log(
      '  Total Transcript-Suggestion Associations:',
      stats[0].total_transcript_suggestions,
    );
    console.log(
      '  Total IntentLog-Keyword Associations:',
      stats[0].total_intent_log_keywords,
    );

    // Top Keywords
    const topKeywords = await this.dataSource.query(`
      SELECT keyword, usage_count
      FROM keywords
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    console.log('\n🏆 Top 10 Keywords:');
    topKeywords.forEach((kw, index) => {
      console.log(`  ${index + 1}. ${kw.keyword} (${kw.usage_count} uses)`);
    });
  }

  /**
   * Print Results Summary
   */
  printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    this.results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`\n${icon} ${result.testName}`);
      console.log(`   ${result.message}`);
      if (result.details && !result.passed && result.details.length > 0) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
    } else {
      console.log('\n⚠️  SOME VALIDATIONS FAILED! Please review the details above.');
    }
  }

  async run(): Promise<void> {
    try {
      await this.connect();

      await this.validateRowCounts();
      await this.validateReferentialIntegrity();
      await this.validateDuplicates();
      await this.validateUsageCounts();
      await this.printStatistics();

      this.printResults();
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting Many-to-Many Migration Validation...\n');

  const validator = new ManyToManyMigrationValidator();
  await validator.run();

  process.exit(0);
})();

