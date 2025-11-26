import type { Logger } from '../logging/logger.js';
import type { LmStudioAdminConfig } from '../config/types.js';
import { createLmStudioHttpClient, type LmStudioHttpClient } from './lmstudioHttpClient.js';
import { createLmStudioCliClient, type LmStudioCliClient } from './lmstudioCliClient.js';
import type {
  LmStudioHttpModel,
  LmStudioHttpServerConfig,
  LmStudioHttpStatus,
  LmStudioHttpTrainingJob,
} from './types.js';

export interface LmStudioUnifiedClient {
  listModels(): Promise<LmStudioHttpModel[]>;
  loadModel(id: string): Promise<void>;
  unloadModel(id: string): Promise<void>;
  getServerConfig(): Promise<LmStudioHttpServerConfig>;
  updateServerConfig(config: Partial<LmStudioHttpServerConfig>): Promise<LmStudioHttpServerConfig>;
  getStatus(): Promise<LmStudioHttpStatus>;
  listTrainingJobs(): Promise<LmStudioHttpTrainingJob[]>;
}

export function createLmStudioClient(config: LmStudioAdminConfig, logger: Logger): LmStudioUnifiedClient {
  const httpClient: LmStudioHttpClient = createLmStudioHttpClient(config.lmstudioHttp, logger);
  const cliClient: LmStudioCliClient = createLmStudioCliClient(config.lmstudioCli, logger);

  async function withFallback<T>(fnHttp: () => Promise<T>, fnCli: () => Promise<T>): Promise<T> {
    try {
      return await fnHttp();
    } catch (err) {
      logger.warn('HTTP-Aufruf fehlgeschlagen, versuche CLI-Fallback', { err });
      return fnCli();
    }
  }

  return {
    listModels() {
      return withFallback(
        () => httpClient.listModels(),
        () => cliClient.listModels(),
      );
    },
    loadModel(id: string) {
      return withFallback(
        () => httpClient.loadModel(id),
        () => cliClient.loadModel(id),
      );
    },
    unloadModel(id: string) {
      return withFallback(
        () => httpClient.unloadModel(id),
        () => cliClient.unloadModel(id),
      );
    },
    getServerConfig() {
      return withFallback(
        () => httpClient.getServerConfig(),
        () => cliClient.getServerConfig(),
      );
    },
    updateServerConfig(configPatch: Partial<LmStudioHttpServerConfig>) {
      return withFallback(
        () => httpClient.updateServerConfig(configPatch),
        () => cliClient.updateServerConfig(configPatch),
      );
    },
    getStatus() {
      return withFallback(
        () => httpClient.getStatus(),
        () => cliClient.getStatus(),
      );
    },
    listTrainingJobs() {
      return withFallback(
        () => httpClient.listTrainingJobs(),
        () => cliClient.listTrainingJobs(),
      );
    },
  };
}

