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

/** @type {import('@angular-devkit/build-angular').ProxyConfig} */
module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    onError(err, req, res) {
      // Swallow frequent noisy errors like ECONNRESET/EAI_AGAIN with a concise log.
      const code = err && (err.code || err.name) || 'UNKNOWN';
      const msg = `[proxy] ${code} while proxying ${req.method} ${req.url} -> ${target}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      try {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad gateway', code, target }));
      } catch (_) {
        // ignore
      }
    },
  },
};
