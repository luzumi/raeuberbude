// @ts-nocheck
import { DataSource, DeepPartial } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../../src/modules/auth/entities';
import { UserRights } from '../../src/modules/auth/entities';
import { SpeechTranscript } from '../../src/modules/logging/entities';
import { UserRole, UserStatus } from '../../src/modules/auth/enums';

config({ path: '.env.test' });

describe('User Entity CRUD & FK Behavior Tests', () => {
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
    // Clean up test data before each test (order matters for FK constraints)
    await dataSource.query('DELETE FROM speech_transcripts CASCADE');
    await dataSource.query('DELETE FROM user_rights CASCADE');
    await dataSource.query('DELETE FROM users CASCADE');
  });

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const userRepo = dataSource.getRepository(User);

      const user = userRepo.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      });

      const savedUser = await userRepo.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.username).toBe('testuser');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should read a user by id', async () => {
      const userRepo = dataSource.getRepository(User);

      const user = await userRepo.save({
        username: 'readuser',
        email: 'read@example.com',
        passwordHash: 'hashed',
      } as any);

      const foundUser = await userRepo.findOne({ where: { id: (user as any).id } });

      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe('readuser');
    });

    it('should update a user', async () => {
      const userRepo = dataSource.getRepository(User);

      const user = await userRepo.save({
        username: 'updateuser',
        email: 'update@example.com',
        passwordHash: 'hashed',
      } as any);

      (user as any).email = 'newemail@example.com';
      const updatedUser = await userRepo.save(user as any);

      expect((updatedUser as any).email).toBe('newemail@example.com');
      expect((updatedUser as any).updatedAt.getTime()).toBeGreaterThanOrEqual((updatedUser as any).createdAt.getTime());
    });

    it('should delete a user', async () => {
      const userRepo = dataSource.getRepository(User);

      const user = await userRepo.save({
        username: 'deleteuser',
        email: 'delete@example.com',
        passwordHash: 'hashed',
      } as any);

      await userRepo.remove(user as any);

      const foundUser = await userRepo.findOne({ where: { id: (user as any).id } });
      expect(foundUser).toBeNull();
    });

    it('should enforce unique username constraint', async () => {
      const userRepo = dataSource.getRepository(User);

      await userRepo.save({
        username: 'uniqueuser',
        email: 'unique1@example.com',
        passwordHash: 'hashed',
      } as any);

      // Try to create another user with the same username
      await expect(
        userRepo.save({
          username: 'uniqueuser',
          email: 'unique2@example.com',
          passwordHash: 'hashed',
        } as any)
      ).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const userRepo = dataSource.getRepository(User);

      await userRepo.save({
        username: 'user1',
        email: 'same@example.com',
        passwordHash: 'hashed',
      } as any);

      // Try to create another user with the same email
      await expect(
        userRepo.save({
          username: 'user2',
          email: 'same@example.com',
          passwordHash: 'hashed',
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('FK Behavior: ON DELETE CASCADE - UserRights', () => {
    it('should cascade delete user_rights when user is deleted', async () => {
      const userRepo = dataSource.getRepository(User);
      const rightsRepo = dataSource.getRepository(UserRights);

      // Create user
      const user = await userRepo.save({
        username: 'cascadeuser',
        email: 'cascade@example.com',
        passwordHash: 'hashed',
      } as any);

      // Create user_rights
      await rightsRepo.save({
        userId: (user as any).id,
        role: UserRole.REGULAR,
        status: UserStatus.ACTIVE,
      } as any);

      // Verify user_rights exists
      const rightsBefore = await rightsRepo.findOne({ where: { userId: (user as any).id } });
      expect(rightsBefore).toBeDefined();

      // Delete user
      await userRepo.remove(user as any);

      // Verify user_rights was cascade deleted
      const rightsAfter = await rightsRepo.findOne({ where: { userId: (user as any).id } });
      expect(rightsAfter).toBeNull();
    });
  });

  describe('FK Behavior: ON DELETE SET NULL - SpeechTranscripts', () => {
    it('should set user_id to NULL in speech_transcripts when user is deleted', async () => {
      const userRepo = dataSource.getRepository(User);
      const transcriptRepo = dataSource.getRepository(SpeechTranscript);

      // Create user
      const user = await userRepo.save({
        username: 'setnulluser',
        email: 'setnull@example.com',
        passwordHash: 'hashed',
      } as any);

      // Create transcript
      const transcript = await transcriptRepo.save({
        userId: (user as any).id,
        transcript: 'Test transcript',
        confidence: 0.95,
      } as any);

      // Verify transcript has user_id
      const transcriptBefore = await transcriptRepo.findOne({ where: { id: (transcript as any).id } });
      expect((transcriptBefore as any)?.userId).toBe((user as any).id);

      // Delete user
      await userRepo.remove(user as any);

      // Verify transcript still exists but user_id is NULL
      const transcriptAfter = await transcriptRepo.findOne({ where: { id: (transcript as any).id } });
      expect(transcriptAfter).toBeDefined();
      expect((transcriptAfter as any)?.userId).toBeNull();
    });
  });

  describe('Relationship Tests', () => {
    it('should create user with user_rights relationship', async () => {
      const userRepo = dataSource.getRepository(User);
      const rightsRepo = dataSource.getRepository(UserRights);

      const user = await userRepo.save({
        username: 'reluser',
        email: 'rel@example.com',
        passwordHash: 'hashed',
      } as any);

      await rightsRepo.save({
        userId: (user as any).id,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        canManageUsers: true,
        canManageTerminals: true,
      } as any);

      // Query with relation
      const userWithRights = await userRepo.findOne({
        where: { id: (user as any).id },
        relations: ['rights'],
      });

      expect((userWithRights as any)?.rights).toBeDefined();
      expect((userWithRights as any)?.rights.role).toBe(UserRole.ADMIN);
      expect((userWithRights as any)?.rights.canManageUsers).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk user creation', async () => {
      const userRepo = dataSource.getRepository(User);

      const users = [];
      for (let i = 0; i < 10; i++) {
        users.push({
          username: `bulkuser${i}`,
          email: `bulk${i}@example.com`,
          passwordHash: 'hashed',
        });
      }

      await userRepo.save(users as any);

      const count = await userRepo.count();
      expect(count).toBe(10);
    });
  });
});

