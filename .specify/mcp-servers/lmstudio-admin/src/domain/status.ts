import type { LmModelStatus } from './model.js';

export interface LmModelRuntimeStatus {
  modelId: string;
  status: LmModelStatus;
  activeRequests: number;
  lastUsedAt?: string;
}

export interface LmServerStatus {
  uptimeSeconds: number;
  loadedModels: LmModelRuntimeStatus[];
  memoryUsageBytes?: number;
}

