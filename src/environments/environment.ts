export const environment = {
  production: false,

  // Backend API URL - full base URL for the API server (no trailing slash)
  backendApiUrl: 'http://localhost:3001',

  // LLM Abort Behavior: 'fail' = Fehler anzeigen, 'skip' = ohne LLM weitermachen
  llmAbortBehavior: 'fail' as 'fail' | 'skip',

  // LLM Configuration
  llm: {
    // LM Studio URL (lokal)
    url: 'http://127.0.0.1:1234',

    // Primäres Modell
    model: 'mistralai/mistral-7b-bnb-homeassistant',

    // Fallback Modell (optional, z.B. LLaMA)
    fallbackModel: '', // z.B. 'meta-llama/llama-3.1-8b-instruct'

    // GPU aktivieren (wenn verfügbar)
    useGpu: true,

    // Timeout für LLM-Anfragen (ms)
    timeoutMs: 30000,

    // Ziel-Latenz (p90, ms) - wird für Monitoring verwendet
    targetLatencyMs: 2000,

    // LLM Parameter
    maxTokens: 500,
    temperature: 0.3,

    // Heuristik-Shortcuts
    confidenceShortcut: 0.85, // Bei STT-Confidence >= 0.85 und guter Heuristik → skip LLM
    heuristicBypass: false, // True = immer Heuristik prüfen vor LLM

    // Cloud-Provider (für zukünftige Erweiterung)
    provider: 'lmstudio' as 'lmstudio' | 'openai' | 'anthropic' | 'local',

    // API Keys (für Cloud, optional)
    apiKey: ''
  },

  // Home Assistant URL (unused when proxy removed)
  homeAssistantUrl: '/api',
  homeAssistantToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y',

  // Legacy apiUrl - deprecated, kept for compatibility
  apiUrl: 'http://localhost:3001',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y'
};
