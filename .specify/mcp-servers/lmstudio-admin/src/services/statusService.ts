import type { Logger } from '../logging/logger.js';
import type { LmServerStatus } from '../domain/status.js';
import type { LmStudioUnifiedClient } from '../infra/lmstudioClientFactory.js';

export interface StatusService {
  getStatus(): Promise<LmServerStatus>;
}

export function createStatusService(client: LmStudioUnifiedClient, logger: Logger): StatusService {
  return {
    async getStatus() {
      logger.debug('StatusService.getStatus');
      const status = await client.getStatus();
      return {
        uptimeSeconds: status.uptimeSeconds,
        loadedModels: status.models.map((m) => ({
          modelId: m.id,
          status: m.loaded ? 'loaded' : 'unloaded',
          activeRequests: 0,
        })),
        memoryUsageBytes: status.memoryUsageBytes,
      };
    },
  };
}

