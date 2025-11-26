import type { Express, Request, Response } from 'express';
import type { Logger } from '../../../logging/logger.js';
import type { TrainingService } from '../../../services/trainingService.js';

export function registerTrainingRoutes(app: Express, deps: { trainingService: TrainingService }, logger: Logger): void {
  app.get('/api/training/jobs', async (_req: Request, res: Response) => {
    try {
      const jobs = await deps.trainingService.listTrainingJobs();
      res.json(jobs);
    } catch (err) {
      logger.error('Fehler bei GET /api/training/jobs', { err });
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });
}

