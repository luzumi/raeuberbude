import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check() {
    const now = new Date();
    let db: 'up' | 'down' = 'down';
    try {
      // Check if TypeORM connection is active
      if (this.dataSource?.isInitialized) {
        // Execute a simple query to verify database is responsive
        await this.dataSource.query('SELECT 1');
        db = 'up';
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'error',
      db,
      database: 'MariaDB',
      uptime: process.uptime(),
      timestamp: now.toISOString(),
    };
  }
}
