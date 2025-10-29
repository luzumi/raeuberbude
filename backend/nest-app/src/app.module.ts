import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

function buildMongoUri(config: ConfigService): string {
  const direct = config.get<string>('MONGO_URI');
  if (direct) return direct;

  const host = config.get<string>('MONGO_HOST', 'localhost');
  const port = config.get<string>('MONGO_PORT', '27017');
  const db = config.get<string>('MONGO_DB', 'raueberbude');
  const user = config.get<string>('MONGO_USER');
  const pass = config.get<string>('MONGO_PASSWORD');
  const authSource = config.get<string>('MONGO_AUTH_SOURCE', 'admin');

  if (user && pass) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=${authSource}`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        // allow using a .env in backend/ when running from nest-app/
        '../.env',
        // fallback to local .env in nest-app/
        '.env',
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: buildMongoUri(config),
      }),
    }),
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
