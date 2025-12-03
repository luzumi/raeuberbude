import {registerAs} from '@nestjs/config';
import {TypeOrmModuleOptions} from '@nestjs/typeorm';

export default registerAs( 'database', (): TypeOrmModuleOptions => {
  const type = (process.env['DB_TYPE'] || 'mariadb') as any; // hast du schon

  const host = process.env['DB_HOST'] || 'localhost';
  const port = Number.parseInt( process.env['DB_PORT'] || (type === 'postgres' ? '5432' : '3306'), 10, );
  const username = process.env['DB_USER'] || (type === 'postgres' ? 'homeassistant' : 'rb_app');
  const password = process.env['DB_PASSWORD'] || (type === 'postgres' ? 'ha_password' : 'rb_secret');
  const database = process.env['DB_NAME'] || (type === 'postgres' ? 'raeuberbude_ha' : 'raeuberbude');

  return {
    type,
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    // ⚠️ synchronize deaktiviert - nutze TypeORM Migrations!
    // Siehe: docs/migrations/LUD28-109-migrations-checklist.md
    synchronize: false,
    logging: process.env['NODE_ENV'] === 'development',
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // Migrations manuell ausführen
    ssl: process.env['DATABASE_SSL'] === 'true'
      ? { rejectUnauthorized: false }
      : false,
  } as TypeOrmModuleOptions;
} );
