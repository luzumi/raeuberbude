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

/** @type {import('@angular-devkit/build-angular').ProxyConfig} */
module.exports = {
  '/api/speech': {
    target: nestTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'warn',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: nestTarget }));
      } catch (e) {console.log(e);}
    },
  },
  // NestJS Users CRUD
  '/users': {
    target: nestTarget,
    secure: false,
    changeOrigin: true,
    ws: false,
    logLevel: 'warn',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      // eslint-disable-next-line no-console
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
    logLevel: 'warn',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${nestTarget}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target: nestTarget }));
      } catch (e) {console.log(e);}
    },
  },
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    onError(err, req, res) {
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${target}`;
      // eslint-disable-next-line no-console
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
