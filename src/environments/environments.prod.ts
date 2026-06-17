export const environment = {
  production: true,

  // Empty string = relative URLs → Nginx proxies /api/* to the backend
  backendApiUrl: '',

  // Home Assistant URL (direct WebSocket connection – same as dev)
  homeAssistantUrl: 'http://homeassistant.local:8123/api',
  homeAssistantToken: '',

  // Legacy – deprecated
  apiUrl: '',
  token: ''
};
