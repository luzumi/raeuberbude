import axios, { AxiosInstance } from 'axios';
import type { Logger } from '../logging/logger.js';
import type { LmStudioHttpConfig } from '../config/types.js';
import type {
  LmStudioHttpModel,
  LmStudioHttpServerConfig,
  LmStudioHttpStatus,
  LmStudioHttpTrainingJob,
} from './types.js';

export interface LmStudioHttpClient {
  listModels(): Promise<LmStudioHttpModel[]>;
  loadModel(id: string): Promise<void>;
  unloadModel(id: string): Promise<void>;
  getServerConfig(): Promise<LmStudioHttpServerConfig>;
  updateServerConfig(config: Partial<LmStudioHttpServerConfig>): Promise<LmStudioHttpServerConfig>;
  getStatus(): Promise<LmStudioHttpStatus>;
  listTrainingJobs(): Promise<LmStudioHttpTrainingJob[]>;
}

export function createLmStudioHttpClient(config: LmStudioHttpConfig, logger: Logger): LmStudioHttpClient {
  const client: AxiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
  });

  // Hinweis: Die konkreten Pfade/Antwortstrukturen der LM Studio API
  // müssen noch an die reale Doku angepasst werden. Hier wird nur das
  // Interface vorbereitet.

  return {
    async listModels() {
      logger.debug('HTTP: listModels');
      // ...später implementieren
      return [];
    },
    async loadModel(id: string) {
      logger.debug('HTTP: loadModel', { id });
      // ...später implementieren
    },
    async unloadModel(id: string) {
      logger.debug('HTTP: unloadModel', { id });
      // ...später implementieren
    },
    async getServerConfig() {
      logger.debug('HTTP: getServerConfig');
      // ...später implementieren
      return { ttlSeconds: 0, autoEvict: false };
    },
    async updateServerConfig(configPatch: Partial<LmStudioHttpServerConfig>) {
      logger.debug('HTTP: updateServerConfig', { configPatch });
      // ...später implementieren
      return { ttlSeconds: 0, autoEvict: false };
    },
    async getStatus() {
      logger.debug('HTTP: getStatus');
      // ...später implementieren
      return { uptimeSeconds: 0, models: [] };
    },
    async listTrainingJobs() {
      logger.debug('HTTP: listTrainingJobs');
      // ...später implementieren
      return [];
    },
  };
}

