import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mariadb',
  host: process.env['MARIADB_HOST'] || 'localhost',
  port: Number.parseInt(process.env['MARIADB_PORT'] || '3306', 10),
  username: process.env['MARIADB_USER'] || 'rb_user',
  password: process.env['MARIADB_PASSWORD'] || 'rb_user_secret',
  database: process.env['MARIADB_DATABASE'] || 'raueberbude',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // Enable auto schema sync for development (DISABLE IN PRODUCTION!)
  // In production, use explicit migrations instead.
  synchronize: process.env['NODE_ENV'] !== 'production',
  logging: process.env['NODE_ENV'] === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  charset: 'utf8mb4',
  timezone: 'Z',
}));
