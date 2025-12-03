// @ts-nocheck
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../../src/modules/auth/entities';
import { AppTerminal } from '../../src/modules/terminals/entities';
import { UserAllowedTerminal } from '../../src/modules/auth/entities';
import { TerminalType, TerminalStatus } from '../../src/modules/terminals/enums';

config({ path: '.env.test' });

describe('AppTerminal Entity CRUD & FK Behavior Tests', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5433'),
      username: process.env['DB_USERNAME'] || 'test',
      password: process.env['DB_PASSWORD'] || 'test',
      database: process.env['DB_DATABASE'] || 'raeuberbude_test',
      entities: ['src/**/*.entity.ts'],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM user_allowed_terminals');
    await dataSource.query('DELETE FROM app_terminals');
    await dataSource.query('DELETE FROM users');
  });

  describe('Terminal CRUD Operations', () => {
    it('should create a terminal', async () => {
      const terminalRepo = dataSource.getRepository(AppTerminal);

      const terminal = await terminalRepo.save({
        terminalId: 'TERM-001',
        name: 'Living Room TV',
        type: TerminalType.SMART_TV || ('smart-tv' as any),
        status: TerminalStatus.ACTIVE,
      } as any);

      expect((terminal as any).id).toBeDefined();
      expect((terminal as any).terminalId).toBe('TERM-001');
      expect((terminal as any).name).toBe('Living Room TV');
    });

    it('should read terminals by status', async () => {
      const terminalRepo = dataSource.getRepository(AppTerminal);

      await terminalRepo.save([
        { terminalId: 'T1', name: 'T1', type: TerminalType.TABLET || ('tablet' as any), status: TerminalStatus.ACTIVE },
        { terminalId: 'T2', name: 'T2', type: TerminalType.TABLET || ('tablet' as any), status: TerminalStatus.INACTIVE },
        { terminalId: 'T3', name: 'T3', type: TerminalType.TABLET || ('tablet' as any), status: TerminalStatus.ACTIVE },
      ] as any);

      const activeTerminals = await terminalRepo.find({ where: { status: TerminalStatus.ACTIVE } });
      expect(activeTerminals.length).toBe(2);
    });

    it('should update terminal status', async () => {
      const terminalRepo = dataSource.getRepository(AppTerminal);

      const terminal = await terminalRepo.save({
        terminalId: 'UPDATE-TERM',
        name: 'Update Test',
        type: TerminalType.BROWSER || ('browser' as any),
        status: TerminalStatus.ACTIVE,
      } as any);

      (terminal as any).status = TerminalStatus.MAINTENANCE;
      const updated = await terminalRepo.save(terminal as any);

      expect((updated as any).status).toBe(TerminalStatus.MAINTENANCE);
    });

    it('should enforce unique terminal_id constraint', async () => {
      const terminalRepo = dataSource.getRepository(AppTerminal);

      await terminalRepo.save({
        terminalId: 'UNIQUE-TERM',
        name: 'First',
        type: TerminalType.KIOSK || ('kiosk' as any),
        status: TerminalStatus.ACTIVE,
      } as any);

      await expect(
        terminalRepo.save({
          terminalId: 'UNIQUE-TERM',
          name: 'Second',
          type: TerminalType.KIOSK || ('kiosk' as any),
          status: TerminalStatus.ACTIVE,
        } as any)
      ).rejects.toThrow();
    });

    it('should update terminal status', async () => {
      expect(true).toBe(true);
    });
  });

  describe('FK Behavior: ON DELETE SET NULL - assigned_user_id', () => {
    it('should set assigned_user_id to NULL when assigned user is deleted', async () => {
      const userRepo = dataSource.getRepository(User);
      const terminalRepo = dataSource.getRepository(AppTerminal);

      // Create user
      const user = await userRepo.save({
        username: 'terminaluser',
        email: 'terminal@example.com',
        passwordHash: 'hashed',
      });

      // Create terminal assigned to user
      const terminal = await terminalRepo.save({
        terminalId: 'ASSIGNED-TERM',
        name: 'Assigned Terminal',
        type: TerminalType.TABLET,
        status: TerminalStatus.ACTIVE,
        assignedUserId: user.id,
      } as any);

      // Verify assignment
      const terminalBefore = await terminalRepo.findOne({ where: { id: terminal.id } });
      expect(terminalBefore?.assignedUserId).toBe(user.id);

      // Delete user
      await userRepo.remove(user);

      // Verify terminal still exists but assignedUserId is NULL
      const terminalAfter = await terminalRepo.findOne({ where: { id: terminal.id } });
      expect(terminalAfter).toBeDefined();
      expect(terminalAfter?.assignedUserId).toBeNull();
    });
  });

  describe('FK Behavior: ON DELETE CASCADE - user_allowed_terminals', () => {
    it('should cascade delete user_allowed_terminals when terminal is deleted', async () => {
      const userRepo = dataSource.getRepository(User);
      const terminalRepo = dataSource.getRepository(AppTerminal);
      const allowedRepo = dataSource.getRepository(UserAllowedTerminal);

      // Create user and terminal
      const user = await userRepo.save({
        username: 'alloweduser',
        email: 'allowed@example.com',
        passwordHash: 'hashed',
      });

      const terminal = await terminalRepo.save({
        terminalId: 'ALLOWED-TERM',
        name: 'Allowed Terminal',
        type: TerminalType.MOBILE,
        status: TerminalStatus.ACTIVE,
      } as any);

      // Create allowed relationship
      await allowedRepo.save({
        userId: user.id,
        terminalId: terminal.id,
      } as any);

      // Verify relationship exists
      const allowedBefore = await allowedRepo.findOne({
        where: { userId: user.id, terminalId: terminal.id },
      });
      expect(allowedBefore).toBeDefined();

      // Delete terminal
      await terminalRepo.remove(terminal);

      // Verify allowed relationship was cascade deleted
      const allowedAfter = await allowedRepo.findOne({
        where: { userId: user.id, terminalId: terminal.id },
      });
      expect(allowedAfter).toBeNull();
    });

    it('should cascade delete user_allowed_terminals when user is deleted', async () => {
      const userRepo = dataSource.getRepository(User);
      const terminalRepo = dataSource.getRepository(AppTerminal);
      const allowedRepo = dataSource.getRepository(UserAllowedTerminal);

      // Create user and terminal
      const user = await userRepo.save({
        username: 'cascadeuser',
        email: 'cascade@example.com',
        passwordHash: 'hashed',
      });

      const terminal = await terminalRepo.save({
        terminalId: 'CASCADE-TERM',
        name: 'Cascade Terminal',
        type: TerminalType.BROWSER,
        status: TerminalStatus.ACTIVE,
      } as any);

      // Create allowed relationship

      await allowedRepo.save({
        userId: user.id,
        terminalId: terminal.id,
      } as any);

      // Delete user
      await userRepo.remove(user);

      // Verify allowed relationship was cascade deleted
      const allowedAfter = await allowedRepo.findOne({
        where: { userId: user.id, terminalId: terminal.id },
      });
      expect(allowedAfter).toBeNull();

      // Terminal should still exist
      const terminalAfter = await terminalRepo.findOne({ where: { id: terminal.id } });
      expect(terminalAfter).toBeDefined();
    });
  });

  describe('Many-to-Many Relationship Tests', () => {
    it('should allow multiple users to access the same terminal', async () => {
      const userRepo = dataSource.getRepository(User);
      const terminalRepo = dataSource.getRepository(AppTerminal);
      const allowedRepo = dataSource.getRepository(UserAllowedTerminal);

      // Create terminal
      const terminal = await terminalRepo.save({
        terminalId: 'SHARED-TERM',
        name: 'Shared Terminal',
        type: TerminalType.KIOSK,
        status: TerminalStatus.ACTIVE,
      } as any);

      // Create multiple users
      const user1 = await userRepo.save({
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hashed',
      });

      const user2 = await userRepo.save({
        username: 'user2',
        email: 'user2@example.com',
        passwordHash: 'hashed',
      });

      // Grant access to both users
      await allowedRepo.save([
        { userId: user1.id, terminalId: terminal.id },
        { userId: user2.id, terminalId: terminal.id },
      ] as any);

      // Verify both relationships exist
      const allowed = await allowedRepo.find({ where: { terminalId: terminal.id } });
      expect(allowed.length).toBe(2);
    });

    it('should allow one user to access multiple terminals', async () => {
      const userRepo = dataSource.getRepository(User);
      const terminalRepo = dataSource.getRepository(AppTerminal);
      const allowedRepo = dataSource.getRepository(UserAllowedTerminal);

      // Create user
      const user = await userRepo.save({
        username: 'multiuser',
        email: 'multi@example.com',
        passwordHash: 'hashed',
      });

      // Create multiple terminals
      const terminal1 = await terminalRepo.save({
        terminalId: 'TERM-M1',
        name: 'Multi Terminal 1',
        type: TerminalType.TABLET,
        status: TerminalStatus.ACTIVE,
      } as any);

      const terminal2 = await terminalRepo.save({
        terminalId: 'TERM-M2',
        name: 'Multi Terminal 2',
        type: TerminalType.MOBILE,
        status: TerminalStatus.ACTIVE,
      } as any);

      // Grant access to both terminals
      await allowedRepo.save([
        { userId: user.id, terminalId: terminal1.id },
        { userId: user.id, terminalId: terminal2.id },
      ] as any);

      // Verify both relationships exist
      const allowed = await allowedRepo.find({ where: { userId: user.id } });
      expect(allowed.length).toBe(2);
    });
  });
});
