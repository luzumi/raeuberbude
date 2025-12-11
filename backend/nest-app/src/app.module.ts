import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUsersModule } from './modules/auth/app-users.module';
import { HealthModule } from './health/health.module';
import { HomeAssistantModule } from './modules/homeassistant/homeassistant.module';
import { SpeechModule } from './modules/speech/speech.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { LoggingModule } from './modules/logging/logging.module';
import databaseConfig from './config/database.config';


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
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database'),
    }),
    AppUsersModule,
    HealthModule,
    HomeAssistantModule,
    SpeechModule,
    // Logging module: ersetzt das separate backend/server.js
    LoggingModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
