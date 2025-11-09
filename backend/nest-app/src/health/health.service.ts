import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check() {
    const now = new Date();
    let db: 'up' | 'down' = 'down';
    try {
      if ( this.connection?.readyState === 1 && this.connection.db) {
        await this.connection.db.admin().ping();
        db = 'up';
      }
        } catch (error) {
      console.error('Database health check failed:', error);
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'error',
      db,
      uptime: process.uptime(),
      timestamp: now.toISOString(),
    };
  }
}
