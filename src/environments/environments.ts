export const environment = {
  production: false,
  // Backend API URL - set to local backend to avoid proxy/relative URLs
  backendApiUrl: 'http://localhost:3001',
  // Home Assistant URL (direct WebSocket connection)
  homeAssistantUrl: 'http://homeassistant.local:8123/api',
  homeAssistantToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y',
  // Legacy token - deprecated, use homeAssistantToken
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y'
};
