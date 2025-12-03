import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load .env for CLI (or .env.test if NODE_ENV=test)
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: envFile });

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE', 'raeuberbude'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

