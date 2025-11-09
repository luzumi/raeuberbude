export const environment = {
  production: false,
  // Relativer Pfad, damit die App auch über `--host 0.0.0.0`
  // erreichbar ist (Angular-Proxy reicht Anfragen weiter).
  homeAssistantUrl: '/api',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYzY4NmRmZGExYzY0MGQ2OTUxNWQ2YmFlZGIwZmE3NCIsImlhdCI6MTc0OTE1MTA4NCwiZXhwIjoyMDY0NTExMDg0fQ.AgjFq7HfSCkSc_IoXs26K7f59m6rwUAkseF8PwRf30Y',
  apiUrl: 'http://192.168.56.1:4200/'
};
