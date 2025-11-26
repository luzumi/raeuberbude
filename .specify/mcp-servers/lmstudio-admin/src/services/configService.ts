import type { Logger } from '../logging/logger.js';
import type { LmServerConfig } from '../domain/serverConfig.js';
import type { LmStudioUnifiedClient } from '../infra/lmstudioClientFactory.js';
import type { LmStudioHttpServerConfig } from '../infra/types.js';

export interface ConfigService {
  getServerConfig(): Promise<LmServerConfig>;
  updateServerConfig(partial: Partial<LmServerConfig>): Promise<LmServerConfig>;
}

export function createConfigService(client: LmStudioUnifiedClient, logger: Logger): ConfigService {
  return {
    async getServerConfig() {
      logger.debug('ConfigService.getServerConfig');
      const cfg = await client.getServerConfig();
      return {
        eviction: {
          ttlSeconds: cfg.ttlSeconds,
          autoEvict: cfg.autoEvict,
          maxLoadedModels: cfg.maxLoadedModels,
        },
      };
    },
    async updateServerConfig(partial: Partial<LmServerConfig>) {
      logger.info('ConfigService.updateServerConfig', { partial });
      const patch: Partial<LmStudioHttpServerConfig> = {};
      // TODO: saubere Validierung und Feldmapping
      if (partial.eviction?.ttlSeconds !== undefined) {
        patch.ttlSeconds = partial.eviction.ttlSeconds;
      }
      if (partial.eviction?.autoEvict !== undefined) {
        patch.autoEvict = partial.eviction.autoEvict;
      }
      if (partial.eviction?.maxLoadedModels !== undefined) {
        patch.maxLoadedModels = partial.eviction.maxLoadedModels;
      }
      const updated = await client.updateServerConfig(patch);
      return {
        eviction: {
          ttlSeconds: updated.ttlSeconds,
          autoEvict: updated.autoEvict,
          maxLoadedModels: updated.maxLoadedModels,
        },
      };
    },
  };
}
