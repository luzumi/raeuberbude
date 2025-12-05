const mysql = require('mysql2/promise');
import { config } from 'dotenv';

// Load .env from project root (let dotenv find it)
config();

async function main() {
  const connConfig = {
    host: process.env.MARIADB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.MARIADB_PORT || process.env.DB_PORT || '3307', 10),
    user: process.env.MARIADB_USER || process.env.DB_USER || 'root',
    password: process.env.MARIADB_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MARIADB_DATABASE || process.env.DB_NAME || 'raueberbude',
  };

  console.log('Connecting to MariaDB at', connConfig.host + ':' + connConfig.port, 'database=', connConfig.database);
  console.log('DB user:', connConfig.user);

  const connection = await mysql.createConnection(connConfig);

  console.log('Connected to MariaDB, creating tables if missing...');

  const stmts = [
    `CREATE TABLE IF NOT EXISTS \`keywords\` (
      \`id\` CHAR(36) NOT NULL,
      \`keyword\` VARCHAR(100) NOT NULL,
      \`normalized\` VARCHAR(100) NOT NULL,
      \`usage_count\` INT NOT NULL DEFAULT 0,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`uq_keywords__keyword\` (\`keyword\`),
      INDEX \`ix_keywords__normalized\` (\`normalized\`),
      INDEX \`ix_keywords__usage_count\` (\`usage_count\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`suggestions\` (
      \`id\` CHAR(36) NOT NULL,
      \`suggestion_text\` TEXT NOT NULL,
      \`text_hash\` CHAR(64) NOT NULL,
      \`usage_count\` INT NOT NULL DEFAULT 0,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`uq_suggestions__text_hash\` (\`text_hash\`),
      INDEX \`ix_suggestions__usage_count\` (\`usage_count\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`transcript_keywords\` (
      \`transcript_id\` CHAR(36) NOT NULL,
      \`keyword_id\` CHAR(36) NOT NULL,
      \`position\` INT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`transcript_id\`, \`keyword_id\`),
      INDEX \`ix_transcript_keywords__keyword_id\` (\`keyword_id\`),
      CONSTRAINT \`fk_transcript_keywords__transcripts\` FOREIGN KEY (\`transcript_id\`) REFERENCES \`transcripts\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_transcript_keywords__keywords\` FOREIGN KEY (\`keyword_id\`) REFERENCES \`keywords\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`transcript_suggestions\` (
      \`transcript_id\` CHAR(36) NOT NULL,
      \`suggestion_id\` CHAR(36) NOT NULL,
      \`position\` INT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`transcript_id\`, \`suggestion_id\`),
      INDEX \`ix_transcript_suggestions__suggestion_id\` (\`suggestion_id\`),
      CONSTRAINT \`fk_transcript_suggestions__transcripts\` FOREIGN KEY (\`transcript_id\`) REFERENCES \`transcripts\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_transcript_suggestions__suggestions\` FOREIGN KEY (\`suggestion_id\`) REFERENCES \`suggestions\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`intent_log_keywords\` (
      \`intent_log_id\` CHAR(36) NOT NULL,
      \`keyword_id\` CHAR(36) NOT NULL,
      \`position\` INT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`intent_log_id\`, \`keyword_id\`),
      INDEX \`ix_intent_log_keywords__keyword_id\` (\`keyword_id\`),
      CONSTRAINT \`fk_intent_log_keywords__intent_logs\` FOREIGN KEY (\`intent_log_id\`) REFERENCES \`intent_logs\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_intent_log_keywords__keywords\` FOREIGN KEY (\`keyword_id\`) REFERENCES \`keywords\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  ];

  for (const stmt of stmts) {
    try {
      console.log('Executing DDL...');
      await connection.query(stmt);
    } catch (err: any) {
      console.error('Error executing statement:', err.message);
    }
  }

  console.log('Done. Closing connection.');
  await connection.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
