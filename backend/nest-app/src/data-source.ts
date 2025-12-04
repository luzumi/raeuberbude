import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from './users/entities/user.entity';
import { AppTerminalEntity } from './modules/speech/entities/app-terminal.entity';
import { TranscriptEntity } from './modules/logging/entities/transcript.entity';
import { IntentLogEntity } from './modules/logging/entities/intentlog.entity';
import { HaEntityEntity } from './modules/homeassistant/entities/ha-entity.entity';
import { LlmInstanceEntity } from './modules/llm/entities/llm-instance.entity';
import { CategoryEntity } from './modules/categories/entities/category.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env['MARIADB_HOST'] || '127.0.0.1',
  port: Number.parseInt(process.env['MARIADB_PORT'] || '3307', 10),
  username: process.env['MARIADB_USER'] || 'rb_user',
  password: process.env['MARIADB_PASSWORD'] || 'rb_user_secret',
  database: process.env['MARIADB_DATABASE'] || 'raueberbude',
  entities: [UserEntity, AppTerminalEntity, TranscriptEntity, IntentLogEntity, HaEntityEntity, LlmInstanceEntity, CategoryEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
  charset: 'utf8mb4',
  timezone: 'Z',
});
