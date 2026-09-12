import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeywordsSuggestionsTables1764886700000
  implements MigrationInterface
{
  name = 'AddKeywordsSuggestionsTables1764886700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create keywords master table
    await queryRunner.query(`
      CREATE TABLE \`keywords\` (
        \`id\` CHAR(36) NOT NULL,
        \`keyword\` VARCHAR(100) NOT NULL,
        \`normalized\` VARCHAR(100) NOT NULL,
        \`usage_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_keywords__keyword\` (\`keyword\`),
        INDEX \`ix_keywords__normalized\` (\`normalized\`),
        INDEX \`ix_keywords__usage_count\` (\`usage_count\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create suggestions master table
    await queryRunner.query(`
      CREATE TABLE \`suggestions\` (
        \`id\` CHAR(36) NOT NULL,
        \`suggestion_text\` TEXT NOT NULL,
        \`text_hash\` CHAR(64) NOT NULL,
        \`usage_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_suggestions__text_hash\` (\`text_hash\`),
        INDEX \`ix_suggestions__usage_count\` (\`usage_count\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create transcript_keywords join table
    await queryRunner.query(`
      CREATE TABLE \`transcript_keywords\` (
        \`transcript_id\` CHAR(36) NOT NULL,
        \`keyword_id\` CHAR(36) NOT NULL,
        \`position\` INT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`transcript_id\`, \`keyword_id\`),
        INDEX \`ix_transcript_keywords__keyword_id\` (\`keyword_id\`),
        CONSTRAINT \`fk_transcript_keywords__transcripts\`
          FOREIGN KEY (\`transcript_id\`) REFERENCES \`transcripts\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_transcript_keywords__keywords\`
          FOREIGN KEY (\`keyword_id\`) REFERENCES \`keywords\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create transcript_suggestions join table
    await queryRunner.query(`
      CREATE TABLE \`transcript_suggestions\` (
        \`transcript_id\` CHAR(36) NOT NULL,
        \`suggestion_id\` CHAR(36) NOT NULL,
        \`position\` INT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`transcript_id\`, \`suggestion_id\`),
        INDEX \`ix_transcript_suggestions__suggestion_id\` (\`suggestion_id\`),
        CONSTRAINT \`fk_transcript_suggestions__transcripts\`
          FOREIGN KEY (\`transcript_id\`) REFERENCES \`transcripts\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_transcript_suggestions__suggestions\`
          FOREIGN KEY (\`suggestion_id\`) REFERENCES \`suggestions\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create intent_log_keywords join table
    await queryRunner.query(`
      CREATE TABLE \`intent_log_keywords\` (
        \`intent_log_id\` CHAR(36) NOT NULL,
        \`keyword_id\` CHAR(36) NOT NULL,
        \`position\` INT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`intent_log_id\`, \`keyword_id\`),
        INDEX \`ix_intent_log_keywords__keyword_id\` (\`keyword_id\`),
        CONSTRAINT \`fk_intent_log_keywords__intent_logs\`
          FOREIGN KEY (\`intent_log_id\`) REFERENCES \`intent_logs\`(\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_intent_log_keywords__keywords\`
          FOREIGN KEY (\`keyword_id\`) REFERENCES \`keywords\`(\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop join tables first (due to FK constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS \`intent_log_keywords\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transcript_suggestions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transcript_keywords\``);

    // Drop master tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`suggestions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`keywords\``);
  }
}

