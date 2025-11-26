import type { Logger } from '../logging/logger.js';
import type { TrainingJob } from '../domain/training.js';
import type { LmStudioUnifiedClient } from '../infra/lmstudioClientFactory.js';

export interface TrainingService {
  listTrainingJobs(): Promise<TrainingJob[]>;
}

export function createTrainingService(client: LmStudioUnifiedClient, logger: Logger): TrainingService {
  return {
    async listTrainingJobs() {
      logger.debug('TrainingService.listTrainingJobs');
      const jobs = await client.listTrainingJobs();
      return jobs.map((j) => ({
        id: j.id,
        modelId: j.modelId,
        status: j.status as TrainingJob['status'],
        progressPercent: j.progress,
      }));
    },
  };
}

