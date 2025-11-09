import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = app.get(ConfigService);
  // Apply body size limits for audio uploads
  const bodyLimitMb = parseInt(config.get<string>('NEST_BODY_LIMIT_MB') || '25', 10);
  const limit = `${isNaN(bodyLimitMb) ? 25 : bodyLimitMb}mb`;
  app.use(json({ limit }));
  app.use(urlencoded({ extended: true, limit }));
  // Configure CORS for Angular frontend; supports comma-separated origins
  const origins = (config.get<string>('CORS_ORIGINS') || 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // allow non-browser clients (no origin) and configured origins
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
  const port = Number.parseInt(config.get<string>('NEST_PORT') || '3001', 10);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`NestJS API listening on http://localhost:${port}`);
}

bootstrap().then();
