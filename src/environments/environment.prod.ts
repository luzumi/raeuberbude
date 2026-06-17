export const environment = {
  production: true,

  // Empty string = relative URLs → Nginx proxies /api/* to the backend
  backendApiUrl: '',

  llmAbortBehavior: 'skip' as 'fail' | 'skip',

  llm: {
    url: '',
    model: '',
    fallbackModel: '',
    useGpu: false,
    timeoutMs: 30000,
    targetLatencyMs: 2000,
    maxTokens: 500,
    temperature: 0.3,
    confidenceShortcut: 0.85,
    heuristicBypass: false,
    provider: 'anthropic' as 'lmstudio' | 'openai' | 'anthropic' | 'local',
    apiKey: ''
  },

  // Home Assistant URL (direct WebSocket connection – same as dev)
  homeAssistantUrl: 'http://homeassistant.local:8123/api',
  homeAssistantToken: '',

  // Legacy – deprecated
  apiUrl: '',
  token: ''
};
