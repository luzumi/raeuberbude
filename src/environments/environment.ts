export const environment = {
  production: false,

  // Backend API URL - für Netzwerkzugriff (alle Terminals verwenden diese URL)
  backendApiUrl: 'http://192.168.178.25:4301',

  // LLM Abort Behavior: 'fail' = Fehler anzeigen, 'skip' = ohne LLM weitermachen
  llmAbortBehavior: 'fail' as 'fail' | 'skip',

  // Home Assistant URL (relativer Pfad über Angular-Proxy)
  homeAssistantUrl: '/api',
  homeAssistantToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y',

  // Legacy apiUrl - deprecated
  apiUrl: 'http://192.168.56.1:4200/',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y'
};
