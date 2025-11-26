import type { Express, Request, Response } from 'express';
import type { Logger } from '../../../logging/logger.js';
import type { ConfigService } from '../../../services/configService.js';

export function registerConfigRoutes(app: Express, deps: { configService: ConfigService }, logger: Logger): void {
  app.get('/api/config/llm', async (_req: Request, res: Response) => {
    try {
      const cfg = await deps.configService.getServerConfig();
      res.json(cfg);
    } catch (err) {
      logger.error('Fehler bei GET /api/config/llm', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  app.put('/api/config/llm', async (req: Request, res: Response) => {
    try {
      const updated = await deps.configService.updateServerConfig(req.body ?? {});
      res.json(updated);
    } catch (err) {
      logger.error('Fehler bei PUT /api/config/llm', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });
}

