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
  };
  createdAt?: Date;
}

