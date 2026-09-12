import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load .env for CLI (or .env.test if NODE_ENV=test)
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: envFile });

const configService = new ConfigService();

export default new DataSource({
  type: 'mariadb',
  host: configService.get('MARIADB_HOST', '127.0.0.1'),
  port: configService.get('MARIADB_PORT', 3307),
  username: configService.get('MARIADB_USER', 'rb_user'),
  password: configService.get('MARIADB_PASSWORD', 'rb_user_secret'),
  database: configService.get('MARIADB_DATABASE', 'raueberbude'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
  charset: 'utf8mb4',
  timezone: 'Z',
});

