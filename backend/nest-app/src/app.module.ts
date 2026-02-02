import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { HomeAssistantModule } from './modules/homeassistant/homeassistant.module';
import { SpeechModule } from './modules/speech/speech.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { LoggingModule } from './modules/logging/logging.module';
import databaseConfig from './config/database.config';

function buildMongoUri(config: ConfigService): string {
  const direct = config.get<string>('MONGO_URI');
  if (direct) return direct;

  const host = config.get<string>('MONGO_HOST', 'localhost');
  const port = config.get<string>('MONGO_PORT', '27017');
  const db = config.get<string>('MONGO_DB', 'raeuberbude');
  const user = config.get<string>('MONGO_USER');
  const pass = config.get<string>('MONGO_PASSWORD');
  const authSource = config.get<string>('MONGO_AUTH_SOURCE', 'admin');

  if (user && pass) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=${authSource}`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

// Build imports array dynamically so TypeOrmModule can be skipped when not needed
const APP_IMPORTS = [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [
      // allow using a .env in backend/ when running from nest-app/
      '../.env',
      // fallback to local .env in nest-app/
      '.env',
    ],
    load: [databaseConfig],
  }),
  MongooseModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      uri: buildMongoUri(config),
    }),
  }),
];

// Decide whether to enable TypeORM at runtime. Use environment flags so the app
// does not attempt to connect to MariaDB when it's not required/available.
const DATABASE_ENABLED = (process.env['DATABASE_ENABLED'] || '').toLowerCase() === 'true';
const DATABASE_TYPE = (process.env['DATABASE_TYPE'] || '').toLowerCase();

if (DATABASE_ENABLED || DATABASE_TYPE === 'mariadb' || DATABASE_TYPE === 'mysql' || process.env['MARIADB_HOST']) {
  APP_IMPORTS.push(
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database'),
    }),
  );
}

@Module({
  imports: [
    ...APP_IMPORTS,
    UsersModule,
    HealthModule,
    HomeAssistantModule,
    SpeechModule,
    // Logging module: ersetzt das separate backend/server.js
    LoggingModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
