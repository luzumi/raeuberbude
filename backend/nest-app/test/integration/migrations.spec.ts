import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

describe('Database Migrations Integration Tests', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Create a test data source
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5433'),
      username: process.env['DB_USERNAME'] || 'test',
      password: process.env['DB_PASSWORD'] || 'test',
      database: process.env['DB_DATABASE'] || 'raeuberbude_test',
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/migrations/*.ts'],
      synchronize: false,
      logging: false,
      dropSchema: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Migration Execution', () => {
    it('should run all pending migrations successfully', async () => {
      const pendingMigrations = await dataSource.showMigrations();
      console.log(`Pending migrations: ${pendingMigrations}`);

      // Run migrations
      await dataSource.runMigrations();

      // Check that no migrations are pending
      const stillPending = await dataSource.showMigrations();
      expect(stillPending).toBe(false);
    });

    it('should have executed at least the InitialSchema migration', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const migrations = await queryRunner.query(
          `SELECT * FROM migrations ORDER BY timestamp DESC`
        );

        expect(migrations.length).toBeGreaterThan(0);
        expect(migrations.some((m: any) => m.name.includes('InitialSchema'))).toBe(true);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Schema Validation - Tables', () => {
    it('should have created all required tables', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const tables = await queryRunner.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        const tableNames = tables.map((t: any) => t.table_name);

        // User management tables
        expect(tableNames).toContain('users');
        expect(tableNames).toContain('user_rights');
        expect(tableNames).toContain('user_allowed_terminals');

        // Terminal tables
        expect(tableNames).toContain('appterminals');
        expect(tableNames).toContain('terminal_rights');

        // Speech input tables
        expect(tableNames).toContain('speech_test_inputs');
        expect(tableNames).toContain('speech_human_inputs');
        expect(tableNames).toContain('speech_transcripts');

        // Logging tables
        expect(tableNames).toContain('categories');
        expect(tableNames).toContain('intent_logs');
        expect(tableNames).toContain('event_logs');

        // Home Assistant tables
        expect(tableNames).toContain('ha_snapshots');
        expect(tableNames).toContain('ha_persons');
        expect(tableNames).toContain('ha_areas');
        expect(tableNames).toContain('ha_devices');
        expect(tableNames).toContain('ha_entities');
        expect(tableNames).toContain('ha_entity_states');
        expect(tableNames).toContain('ha_entity_attributes');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Schema Validation - Primary Keys', () => {
    it('should have primary keys on all main tables', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const pks = await queryRunner.query(`
          SELECT
            con.conname AS constraint_name,
            rel.relname AS table_name
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          WHERE con.contype = 'p'
            AND rel.relname IN ('users', 'user_rights', 'app_terminals', 'ha_entities', 'ha_snapshots')
          ORDER BY rel.relname
        `);

        const pkTables = pks.map((pk: any) => pk.table_name);

        expect(pkTables).toContain('users');
        expect(pkTables).toContain('user_rights');
        expect(pkTables).toContain('app_terminals');
        expect(pkTables).toContain('ha_entities');
        expect(pkTables).toContain('ha_snapshots');

        // Check naming convention
        const usersKeyName = pks.find((pk: any) => pk.table_name === 'users')?.constraint_name;
        expect(usersKeyName).toBe('pk_users');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Schema Validation - Foreign Keys', () => {
    it('should have all critical foreign key constraints', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const fks = await queryRunner.query(`
          SELECT
            con.conname AS fk_name,
            rel.relname AS from_table,
            ref_rel.relname AS to_table
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          JOIN pg_class ref_rel ON con.confrelid = ref_rel.oid
          WHERE con.contype = 'f'
          ORDER BY from_table, fk_name
        `);

        const fkNames = fks.map((fk: any) => fk.fk_name);

        // Critical FK relationships
        expect(fkNames).toContain('fk_user_rights__users__user_id');
        expect(fkNames).toContain('fk_user_allowed_terminals__users__user_id');
        expect(fkNames).toContain('fk_user_allowed_terminals__app_terminals__terminal_id');
        expect(fkNames).toContain('fk_app_terminals__users__assigned_user_id');
        expect(fkNames).toContain('fk_ha_entities__ha_devices__device_id');
        expect(fkNames).toContain('fk_ha_entities__ha_areas__area_id');
        expect(fkNames).toContain('fk_ha_entity_states__ha_entities__entity_id');
      } finally {
        await queryRunner.release();
      }
    });

    it('should have correct ON DELETE CASCADE behavior for user_rights', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const fkInfo = await queryRunner.query(`
          SELECT
            con.conname,
            con.confdeltype AS delete_action
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          WHERE con.contype = 'f'
            AND rel.relname = 'user_rights'
            AND con.conname = 'fk_user_rights__users__user_id'
        `);

        expect(fkInfo.length).toBe(1);
        // 'c' = CASCADE
        expect(fkInfo[0].delete_action).toBe('c');
      } finally {
        await queryRunner.release();
      }
    });

    it('should have correct ON DELETE SET NULL behavior for app_terminals.assigned_user_id', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const fkInfo = await queryRunner.query(`
          SELECT
            con.conname,
            con.confdeltype AS delete_action
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          WHERE con.contype = 'f'
            AND rel.relname = 'app_terminals'
            AND con.conname = 'fk_app_terminals__users__assigned_user_id'
        `);

        expect(fkInfo.length).toBe(1);
        // 'n' = SET NULL
        expect(fkInfo[0].delete_action).toBe('n');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Schema Validation - Unique Constraints', () => {
    it('should have unique constraints on users table', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const uniques = await queryRunner.query(`
          SELECT
            con.conname AS constraint_name
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          WHERE con.contype = 'u'
            AND rel.relname = 'users'
          ORDER BY constraint_name
        `);

        const uniqueNames = uniques.map((u: any) => u.constraint_name);

        expect(uniqueNames).toContain('uq_users__username');
        expect(uniqueNames).toContain('uq_users__email');
      } finally {
        await queryRunner.release();
      }
    });

    it('should have unique constraints on app_terminals table', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const uniques = await queryRunner.query(`
          SELECT
            con.conname AS constraint_name
          FROM pg_constraint con
          JOIN pg_class rel ON con.conrelid = rel.oid
          WHERE con.contype = 'u'
            AND rel.relname = 'app_terminals'
          ORDER BY constraint_name
        `);

        const uniqueNames = uniques.map((u: any) => u.constraint_name);

        expect(uniqueNames).toContain('uq_app_terminals__terminal_id');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Schema Validation - Indexes', () => {
    it('should have required indexes on users table', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const indexes = await queryRunner.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'users'
            AND schemaname = 'public'
          ORDER BY indexname
        `);

        const indexNames = indexes.map((i: any) => i.indexname);

        expect(indexNames).toContain('ix_users__username');
        expect(indexNames).toContain('ix_users__email');
        expect(indexNames).toContain('ix_users__created_at');
      } finally {
        await queryRunner.release();
      }
    });

    it('should have required indexes on ha_entities table', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const indexes = await queryRunner.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'ha_entities'
            AND schemaname = 'public'
          ORDER BY indexname
        `);

        const indexNames = indexes.map((i: any) => i.indexname);

        expect(indexNames).toContain('ix_ha_entities__domain');
        expect(indexNames).toContain('ix_ha_entities__area_id');
        expect(indexNames).toContain('ix_ha_entities__device_id');
      } finally {
        await queryRunner.release();
      }
    });
  });
});

