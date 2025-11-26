import type { Logger } from '../logging/logger.js';
import type { LmModel } from '../domain/model.js';
import type { LmStudioUnifiedClient } from '../infra/lmstudioClientFactory.js';

export interface ModelService {
  listModels(): Promise<LmModel[]>;
  loadModel(id: string): Promise<LmModel | null>;
  unloadModel(id: string): Promise<LmModel | null>;
}

export function createModelService(client: LmStudioUnifiedClient, logger: Logger): ModelService {
  return {
    async listModels() {
      logger.debug('ModelService.listModels');
      const models = await client.listModels();
      // TODO: Mapping von Infra-Model auf Domain-LmModel
      return models.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.loaded ? 'loaded' : 'unloaded',
      }));
    },
    async loadModel(id: string) {
      logger.info('ModelService.loadModel', { id });
      await client.loadModel(id);
      // TODO: optional aktualisierten Status zurückgeben
      return null;
    },
    async unloadModel(id: string) {
      logger.info('ModelService.unloadModel', { id });
      await client.unloadModel(id);
      // TODO: optional aktualisierten Status zurückgeben
      return null;
    },
  };
}

