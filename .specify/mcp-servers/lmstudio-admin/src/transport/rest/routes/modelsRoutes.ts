import type { Express, Request, Response } from 'express';
import type { Logger } from '../../../logging/logger.js';
import type { ModelService } from '../../../services/modelService.js';

export function registerModelsRoutes(app: Express, deps: { modelService: ModelService }, logger: Logger): void {
  app.get('/api/models', async (_req: Request, res: Response) => {
    try {
      const models = await deps.modelService.listModels();
      res.json(models);
    } catch (err) {
      logger.error('Fehler bei GET /api/models', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/models/:id/load', async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      await deps.modelService.loadModel(id);
      res.status(202).json({ status: 'loading', id });
    } catch (err) {
      logger.error('Fehler bei POST /api/models/:id/load', { err, id });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/models/:id/unload', async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      await deps.modelService.unloadModel(id);
      res.status(202).json({ status: 'unloading', id });
    } catch (err) {
      logger.error('Fehler bei POST /api/models/:id/unload', { err, id });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });
}

