export interface LmStudioHttpModel {
  id: string;
  name: string;
  loaded: boolean;
  // Zusätzliche Felder können später ergänzt werden
}

export interface LmStudioHttpServerConfig {
  ttlSeconds: number;
  autoEvict: boolean;
  maxLoadedModels?: number;
}

export interface LmStudioHttpStatus {
  uptimeSeconds: number;
  models: LmStudioHttpModel[];
  memoryUsageBytes?: number;
}

export interface LmStudioHttpTrainingJob {
  id: string;
  modelId: string;
  status: string;
  progress?: number;
}

