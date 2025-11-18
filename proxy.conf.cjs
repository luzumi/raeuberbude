// Dynamic proxy config for Angular (Vite-based dev server)
// Allows overriding Home Assistant target via env vars and adds safer error handling.
// Usage:
//   HA_BASE_URL=http://192.168.1.50:8123 npm start
// or
//   HA_HOST=192.168.1.50 HA_PORT=8123 npm start

const urlFromEnv = () => {
  const base = process.env.HA_BASE_URL;
  if (base) return base;
  const host = process.env.HA_HOST || 'homeassistant.local';
  const port = process.env.HA_PORT || '8123';
  return `http://${host}:${port}`;
};

const target = urlFromEnv();

// NestJS API target (Speech module)
const nestUrlFromEnv = () => {
  const base = process.env.NEST_BASE_URL;
  if (base) return base;
  const host = process.env.NEST_HOST || 'localhost';
  const port = process.env.NEST_PORT || '3001';
  return `http://${host}:${port}`;
};
const nestTarget = nestUrlFromEnv();

// Backend API target (Node.js Express)
const backendUrlFromEnv = () => {
  const base = process.env.BACKEND_BASE_URL;
  if (base) return base;
  const host = process.env.BACKEND_HOST || 'localhost';
  const port = process.env.BACKEND_PORT || '3000';
  return `http://${host}:${port}`;
};
const backendTarget = backendUrlFromEnv();

/** @type {import('@angular-devkit/build-angular').ProxyConfig} */
module.exports = {
  // NestJS Speech API (höchste Priorität)
  '/api/speech': {
    target: nestTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: nestTarget }));
      } catch (e) {console.log(e);}
    },
  },
  // NestJS HomeAssistant Query API
  '/api/homeassistant': {
    target: nestTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: nestTarget }));
      } catch (e) {console.log(e);}
    },
  },
  // Backend API (Transcripts, Intent-Logs etc.)
  '/api/transcripts': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${backendTarget}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: backendTarget }));
      } catch (e) {console.log(e);}
    },
  },
  '/api/intent-logs': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${backendTarget}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: backendTarget }));
      } catch (e) {console.log(e);}
    },
  },
  // NestJS Users CRUD
  '/users': {
    target: nestTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: nestTarget }));
      } catch (e) {console.log(e);}
    },
  },
  // Home Assistant API (catch-all für /api/*, muss LETZTER sein)
  '/api': {
    target: target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${target}`;
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target }));
      } catch (e) {console.log(e);}
    },
  },
};
