export interface LlmInstance {
  _id?: string;
  // Backend sometimes returns `id` instead of `_id`
  id?: string;
  name: string;
  url: string;
  model: string;
  enabled: boolean;
  role?: 'primary' | 'secondary' | 'other';
  isActive: boolean;

  /**
   * Laufzeitstatus (nicht persistent): true, wenn das Modell laut LM Studio (/v1/models oder MCP) aktuell geladen ist.
   * Wird im Admin-UI über den Backend-Endpoint `/api/llm-instances/:id/model-status` gesetzt.
   */
  loadedInLmStudio?: boolean;

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
    // LM-Studio specific sampling fields
    topK?: number;
    topP?: number;
    repeatPenalty?: number;
    minPSampling?: number;
    // LM-Studio specific performance fields
    contextLength?: number;
    evalBatchSize?: number;
    cpuThreads?: number;
    gpuOffload?: boolean;
    keepModelInMemory?: boolean;
    flashAttention?: boolean;
    kCacheQuant?: boolean;
    vCacheQuant?: boolean;
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
