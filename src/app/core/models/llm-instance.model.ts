export interface LlmInstance {
  _id?: string;
  name: string;
  url: string;
  model: string;
  enabled: boolean;
  isActive: boolean;
  systemPrompt?: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  config?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    targetLatencyMs?: number;
    confidenceShortcut?: number;
    useGpu?: boolean;
    heuristicBypass?: boolean;
    fallbackModel?: string;
  };
  createdAt?: Date;
  // Optional results from load/eject operations (returned from backend)
  loadResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
  ejectResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
}

