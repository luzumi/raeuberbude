export interface LlmInstance {
  _id?: string;
  name: string;
  url: string;
  model?: string;
  availableModels?: string[];
  enabled: boolean;
  isActive: boolean;
  systemPrompt?: string;
  health?: {
    status: 'unknown' | 'healthy' | 'unhealthy' | 'checking';
    lastCheck?: string;
    lastSuccess?: string;
    errorMessage?: string;
    responseTimeMs?: number;
  };
  config?: {
    timeoutMs?: number;
    maxTokens?: number;
    temperature?: number;
  };
  stats?: {
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    avgResponseTimeMs?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  lastUsed?: string;
}
