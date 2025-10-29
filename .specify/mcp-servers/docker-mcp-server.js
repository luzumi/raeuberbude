/*
  Docker MCP Server – Steuerung der lokalen Docker Engine
  - HTTP API auf Port MCP_DOCKER_PORT (Default: 4220)
  - Listet Container/Images, Start/Stop/Restart, Logs, Exec, Pull Image
  - Designed als generisches "Tool" für Agenten: GET /tools liefert Operationen + Schemas

  ENV Variablen (optional):
   - MCP_DOCKER_PORT=4220
   - MCP_TOKEN=...                 (schützt alle Endpunkte außer /health, /tools)
   - DOCKER_HOST=...               (z. B. tcp://127.0.0.1:2375 oder npipe:////./pipe/docker_engine)
   - DOCKER_SOCK=...               (z. B. /var/run/docker.sock oder \\./pipe/docker_engine)
*/

try { require('dotenv').config(); } catch (e) {console.error(e);}
const express = require('express');
const Docker = require('dockerode');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.MCP_DOCKER_PORT || 4220);
const MCP_TOKEN = process.env.MCP_TOKEN || '';

// Simple CORS (optional)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mcp-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function getIncomingToken(req) {
  const h = req.headers['authorization'];
  if (h && typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) {
    return h.slice(7).trim();
  }
  if (req.headers['x-mcp-token']) return String(req.headers['x-mcp-token']);
  if (req.query && req.query.token) return String(req.query.token);
  if (req.body && req.body.token) return String(req.body.token);
  return '';
}

function requireAuth(req, res, next) {
  if (!MCP_TOKEN) return next();
  const tok = getIncomingToken(req);
  if (tok && tok === MCP_TOKEN) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

function createDocker() {
  // Priority: DOCKER_SOCK -> DOCKER_HOST -> platform default
  const sock = process.env.DOCKER_SOCK;
  if (sock) {
    return new Docker({ socketPath: sock });
  }
  const host = process.env.DOCKER_HOST;
  if (host) {
    try {
      if (host.startsWith('npipe:')) {
        // Docker Desktop for Windows named pipe
        return new Docker({ socketPath: host });
      }
      const u = new URL(host);
      const protocol = (u.protocol || 'http:').replace(':', '');
      return new Docker({ protocol, host: u.hostname, port: Number(u.port || (protocol === 'https' ? 2376 : 2375)) });
    } catch (e) {console.error(e);}
  }
  if (process.platform === 'win32') {
    // Default named pipe on Windows
    return new Docker({ socketPath: '//./pipe/docker_engine' });
  }
  // Unix default
  return new Docker({ socketPath: '/var/run/docker.sock' });
}

const docker = createDocker();

async function pingDocker() {
  try {
    await docker.ping();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

app.get('/health', async (_req, res) => {
  const ok = await pingDocker();
  let info = null;
  try { info = await docker.version(); } catch (e) {console.error(e);}
  res.json({ ok, port: PORT, engine: info || null });
});

app.get('/tools', (_req, res) => {
  res.json({
    name: 'docker-mcp',
    description: 'Steuert lokale Docker Engine (Container, Images, Logs, Exec) via dockerode',
    baseUrl: `http://localhost:${PORT}`,
    tools: [
      { name: 'listContainers', method: 'GET', path: '/containers', schema: { all: 'boolean?' } },
      { name: 'inspectContainer', method: 'GET', path: '/containers/:id', schema: {} },
      { name: 'logs', method: 'GET', path: '/containers/:id/logs', schema: { stdout: 'boolean?', stderr: 'boolean?', tail: 'number?' } },
      { name: 'start', method: 'POST', path: '/containers/:id/start', schema: {} },
      { name: 'stop', method: 'POST', path: '/containers/:id/stop', schema: { timeout: 'number?' } },
      { name: 'restart', method: 'POST', path: '/containers/:id/restart', schema: { timeout: 'number?' } },
      { name: 'exec', method: 'POST', path: '/containers/:id/exec', schema: { cmd: 'string|string[]', tty: 'boolean?', detach: 'boolean?' } },
      { name: 'listImages', method: 'GET', path: '/images', schema: {} },
      { name: 'pull', method: 'POST', path: '/images/pull', schema: { image: 'string' } },
    ],
  });
});

// Containers
app.get('/containers', requireAuth, async (req, res) => {
  try {
    const all = String(req.query.all || '').toLowerCase() === 'true' || req.query.all === '1';
    const list = await docker.listContainers({ all });
    res.json({ success: true, containers: list });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/containers/:id', requireAuth, async (req, res) => {
  try {
    const c = docker.getContainer(req.params.id);
    const data = await c.inspect();
    res.json({ success: true, container: data });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/containers/:id/logs', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const stdout = (req.query.stdout ?? '1') !== '0';
    const stderr = (req.query.stderr ?? '1') !== '0';
    const tail = Number(req.query.tail || 100);
    const c = docker.getContainer(id);
    const stream = await c.logs({ stdout, stderr, tail, follow: false });
    const chunks = [];
    stream.on('data', (d) => chunks.push(Buffer.from(d)));
    stream.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      res.json({ success: true, id, logs: text });
    });
    stream.on('error', (err) => res.status(500).json({ success: false, error: String(err?.message || err) }));
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/containers/:id/start', requireAuth, async (req, res) => {
  try { await docker.getContainer(req.params.id).start(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: String(e?.message || e) }); }
});

app.post('/containers/:id/stop', requireAuth, async (req, res) => {
  try { await docker.getContainer(req.params.id).stop({ t: Number(req.body?.timeout || 10) }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: String(e?.message || e) }); }
});

app.post('/containers/:id/restart', requireAuth, async (req, res) => {
  try { await docker.getContainer(req.params.id).restart({ t: Number(req.body?.timeout || 10) }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: String(e?.message || e) }); }
});

app.post('/containers/:id/exec', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const cmd = Array.isArray(body.cmd) ? body.cmd.map(String) : String(body.cmd || 'sh').split(' ');
    const tty = !!body.tty;
    const detach = !!body.detach;
    const c = docker.getContainer(id);
    const exec = await c.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true, Tty: tty });
    const stream = await exec.start({ Tty: tty, Detach: detach });
    if (detach) return res.json({ success: true, detached: true });
    const chunks = [];
    stream.on('data', (d) => chunks.push(Buffer.from(d)));
    stream.on('end', async () => {
      let inspect = null;
      try { inspect = await exec.inspect(); } catch (e) {console.error(e);}
      res.json({ success: true, output: Buffer.concat(chunks).toString('utf8'), inspect });
    });
    stream.on('error', (err) => res.status(500).json({ success: false, error: String(err?.message || err) }));
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

// Images
app.get('/images', requireAuth, async (_req, res) => {
  try { const imgs = await docker.listImages({ all: true }); res.json({ success: true, images: imgs }); }
  catch (e) { res.status(500).json({ success: false, error: String(e?.message || e) }); }
});

app.post('/images/pull', requireAuth, async (req, res) => {
  try {
    const image = String(req.body?.image || '').trim();
    if (!image) return res.status(400).json({ success: false, error: 'image fehlt' });
    const stream = await docker.pull(image);
    const progress = [];
    stream.on('data', (d) => {
      try { progress.push(JSON.parse(d.toString('utf8'))); } catch { /* ignore */ }
    });
    stream.on('end', () => res.json({ success: true, image, progress }));
    stream.on('error', (err) => res.status(500).json({ success: false, error: String(err?.message || err) }));
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`[docker-mcp] Listening on http://localhost:${PORT}`);
  console.log(`[docker-mcp] GET  /health`);
  console.log(`[docker-mcp] GET  /tools`);
});
