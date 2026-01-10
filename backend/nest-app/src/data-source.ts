import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env['MARIADB_HOST'] || '127.0.0.1',
  port: Number.parseInt(process.env['MARIADB_PORT'] || '3307', 10),
  username: process.env['MARIADB_USER'] || 'rb_user',
  password: process.env['MARIADB_PASSWORD'] || 'rb_user_secret',
  database: process.env['MARIADB_DATABASE'] || 'raueberbude',
  // Use glob pattern to load only entity files (avoid loading spec/test files)
  entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  // WARNING: synchronize=true creates tables automatically and is intended for development only
  synchronize: process.env['TYPEORM_SYNC_ON_START'] === 'true',
  logging: true,
  charset: 'utf8mb4',
  timezone: 'Z',
});
