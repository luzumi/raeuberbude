import type { Express, Request, Response } from 'express';
import type { Logger } from '../../../logging/logger.js';
import type { StatusService } from '../../../services/statusService.js';

export function registerStatusRoutes(app: Express, deps: { statusService: StatusService }, logger: Logger): void {
  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const status = await deps.statusService.getStatus();
      res.json(status);
    } catch (err) {
      logger.error('Fehler bei GET /api/status', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });
}

