/*
  Web MCP Server – Chrome DevTools (Puppeteer)
  - HTTP API auf Port 4200 (konfigurierbar via MCP_PORT)
  - Steuert echte Webseiten: Sessions, Navigieren, Klicken, Tippen, Evaluate, Screenshot, Logs
  - Designed als generisches "Tool" für Agenten: GET /tools liefert definierte Operationen + Schemas

  ENV Variablen (optional):
   - MCP_PORT=4200
   - MCP_HEADLESS=true|false|new  (Puppeteer headless Mode; default: 'new')
   - MCP_CHROME_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe (falls natives Chrome verwendet werden soll)
   - MCP_DEFAULT_URL=http://localhost:4200
*/

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require('puppeteer');
try { require('dotenv').config(); } catch (e) {console.error(e);}

const app = express();
app.use(express.json({ limit: '10mb' }));

// Config & Security
const MCP_TOKEN = process.env.MCP_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SESSION_TTL_MS = Number.parseInt(process.env.MCP_SESSION_TTL_MS || '600000', 10); // 10 min default
const MAX_SESSIONS = Number.parseInt(process.env.MCP_MAX_SESSIONS || '5', 10);

function isOriginAllowed(origin) {
  if (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes('*')) return true;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// Basic CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
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
  if (!MCP_TOKEN) return next(); // open if no token set
  const tok = getIncomingToken(req);
  if (tok && tok === MCP_TOKEN) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

function isHostAllowed(urlLike) {
  if (!ALLOWED_HOSTS.length || ALLOWED_HOSTS.includes('*')) return true;
  try {
    const u = new URL(sanitizeUrl(urlLike));
    const host = (u.hostname || '').toLowerCase();
    return ALLOWED_HOSTS.some((rule) => {
      if (rule === host) return true;
      if (rule === 'localhost') return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
      if (rule.startsWith('*.')) {
        const domain = rule.slice(2);
        return host === domain || host.endsWith('.' + domain);
      }
      return false;
    });
  } catch (e) {
    console.error(e);
    return false;
  }
}

const PORT = Number(process.env.MCP_PORT || 4200);
const DEFAULT_URL = process.env.MCP_DEFAULT_URL || undefined;

function genId(prefix = 'sess') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizeUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}

function headlessMode() {
  const v = (process.env.MCP_HEADLESS || 'new').toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return 'new';
}

const sessions = new Map();

function updateActivity(session) {
  if (session) session.lastActiveAt = Date.now();
}

function listSessions() {
  const arr = [];
  for (const [s] of sessions) {
    let currentUrl;
    try { currentUrl = typeof s.page?.url === 'function' ? s.page.url() : undefined; }
    catch (e) {
      console.error(e);
      currentUrl = undefined;
    }
    arr.push({ id: s.id, createdAt: s.createdAt, lastActiveAt: s.lastActiveAt || s.createdAt, url: currentUrl });
  }
  return arr;
}

// Cleanup abgelaufener Sessions
setInterval(async () => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    const last = s.lastActiveAt || s.createdAt || 0;
    if (SESSION_TTL_MS > 0 && now - last > SESSION_TTL_MS) {
      try { await closeSession(id); } catch (e) {console.error(e);}
    }
  }
}, Math.max(SESSION_TTL_MS, 30000));

async function startSession(opts = {}) {
  const id = genId();
  const launchOpts = {
    headless: opts?.headless ? opts.headless : headlessMode(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.MCP_CHROME_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.MCP_CHROME_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOpts);
  let context = null;
  let page = null;
  try {
    if (typeof browser.createIncognitoBrowserContext === 'function') {
      context = await browser.createIncognitoBrowserContext();
      page = await context.newPage();
    }
  } catch (e) {console.error(e);}
  if (!page) {
    page = await browser.newPage();
    context = page.browserContext();
  }

  if (opts.userAgent) {
    await page.setUserAgent(String(opts.userAgent));
  }
  if (opts.viewport && typeof opts.viewport === 'object') {
    await page.setViewport({
      width: Math.max(1, Number(opts.viewport.width || 1280)),
      height: Math.max(1, Number(opts.viewport.height || 800)),
      deviceScaleFactor: Number(opts.viewport.deviceScaleFactor || 1),
      isMobile: !!opts.viewport.isMobile,
    });
  }

  const consoleLogs = [];
  const networkLogs = [];

  page.on('console', (msg) => {
    consoleLogs.push({
      ts: Date.now(),
      type: msg.type(),
      text: msg.text(),
    });
  });
  page.on('request', (req) => {
    try {
      networkLogs.push({
        ts: Date.now(),
        phase: 'request',
        method: req.method(),
        url: req.url(),
      });
    } catch (e) {console.error(e);}
  });
  page.on('response', (res) => {
    try {
      networkLogs.push({
        ts: Date.now(),
        phase: 'response',
        status: res.status(),
        url: res.url(),
      });
    } catch (e) {console.error(e);}
  });

  const session = { id, createdAt: Date.now(), browser, context, page, consoleLogs, networkLogs };
  sessions.set(id, session);

  if (opts.url) {
    await page.goto(sanitizeUrl(opts.url), { waitUntil: opts.waitUntil || 'networkidle0', timeout: opts.timeout || 60000 });
  }
  return session;
}

async function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return false;
  try { await s.browser.close(); } catch (e) {console.error(e);}
  sessions.delete(id);
  return true;
}

function ensureSession(req, res) {
  const id = req.params.id || req.query.sessionId || req.body.sessionId;
  if (!id || !sessions.has(id)) {
    res.status(404).json({ success: false, error: 'Session nicht gefunden', sessionId: id || null });
    return null;
  }
  const s = sessions.get(id);
  updateActivity(s);
  return s;
}

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true, port: PORT, sessions: sessions.size, headless: headlessMode() });
});

// Tool Discovery
app.get('/tools', (_req, res) => {
  res.json({
    name: 'web-mcp-devtools',
    description: 'Steuert echte Webseiten via Chrome DevTools (Puppeteer)',
    baseUrl: `http://localhost:${PORT}`,
    tools: [
      { name: 'createSession', method: 'POST', path: '/sessions', schema: { url: 'string?', headless: 'boolean|string?', viewport: '{width,height,deviceScaleFactor?,isMobile?}', userAgent: 'string?' } },
      { name: 'closeSession', method: 'POST', path: '/sessions/:id/close', schema: {} },
      { name: 'deleteSession', method: 'DELETE', path: '/sessions/:id', schema: {} },
      { name: 'listSessions', method: 'GET', path: '/sessions', schema: {} },
      { name: 'closeAllSessions', method: 'POST', path: '/sessions/closeAll', schema: {} },
      { name: 'navigate', method: 'POST', path: '/sessions/:id/navigate', schema: { url: 'string', waitUntil: 'string?', timeout: 'number?' } },
      { name: 'waitForSelector', method: 'POST', path: '/sessions/:id/waitForSelector', schema: { selector: 'string', timeout: 'number?' } },
      { name: 'click', method: 'POST', path: '/sessions/:id/click', schema: { selector: 'string', button: 'string?', clickCount: 'number?' } },
      { name: 'type', method: 'POST', path: '/sessions/:id/type', schema: { selector: 'string', text: 'string', delay: 'number?' } },
      { name: 'pressKey', method: 'POST', path: '/sessions/:id/pressKey', schema: { key: 'string', selector: 'string?' } },
      { name: 'evaluate', method: 'POST', path: '/sessions/:id/evaluate', schema: { expression: 'string', arg: 'any?' } },
      { name: 'content', method: 'GET', path: '/sessions/:id/content', schema: {} },
      { name: 'screenshot', method: 'POST', path: '/sessions/:id/screenshot', schema: { fullPage: 'boolean?', path: 'string?' } },
      { name: 'consoleLogs', method: 'GET', path: '/sessions/:id/logs/console', schema: {} },
      { name: 'networkLogs', method: 'GET', path: '/sessions/:id/logs/network', schema: {} },
      { name: 'hover', method: 'POST', path: '/sessions/:id/hover', schema: { selector: 'string' } },
      { name: 'scrollTo', method: 'POST', path: '/sessions/:id/scrollTo', schema: { x: 'number?', y: 'number?', selector: 'string?' } },
      { name: 'viewport', method: 'POST', path: '/sessions/:id/viewport', schema: { width: 'number', height: 'number', deviceScaleFactor: 'number?', isMobile: 'boolean?' } },
    ],
  });
});

// Sessions
app.get('/sessions', requireAuth, (_req, res) => {
  res.json({ success: true, sessions: listSessions() });
});

app.post('/sessions/closeAll', requireAuth, async (_req, res) => {
  let count = 0;
  for (const [id] of sessions) {
    try { await closeSession(id); count++; } catch (e) {console.error(e);}
  }
  res.json({ success: true, closed: count });
});

app.delete('/sessions/:id', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  await closeSession(s.id);
  res.json({ success: true });
});

app.post('/sessions', requireAuth, async (req, res) => {
  try {
    if (MAX_SESSIONS > 0 && sessions.size >= MAX_SESSIONS) {
      return res.status(429).json({ success: false, error: 'Zu viele Sessions (MAX_SESSIONS erreicht)' });
    }
    const { url, headless, viewport, userAgent, waitUntil, timeout, label } = req.body || {};
    if (url && !isHostAllowed(url)) {
      return res.status(403).json({ success: false, error: 'Host nicht erlaubt', url });
    }
    const s = await startSession({ url, headless, viewport, userAgent, waitUntil, timeout });
    if (label) s.label = String(label).slice(0, 100);
    updateActivity(s);
    res.json({ success: true, sessionId: s.id });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

app.post('/sessions/:id/close', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  await closeSession(s.id);
  res.json({ success: true });
});

// Navigation
app.post('/sessions/:id/navigate', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { url, waitUntil = 'networkidle0', timeout = 60000 } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'url fehlt' });
    if (!isHostAllowed(url)) return res.status(403).json({ success: false, error: 'Host nicht erlaubt', url });
    await s.page.goto(sanitizeUrl(url), { waitUntil, timeout });
    updateActivity(s);
    res.json({ success: true, url: s.page.url() });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

app.post('/sessions/:id/waitForSelector', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { selector, timeout = 30000 } = req.body || {};
    if (!selector) return res.status(400).json({ success: false, error: 'selector fehlt' });
    const el = await s.page.waitForSelector(selector, { timeout });
    updateActivity(s);
    res.json({ success: true, visible: !!el });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Interactions
app.post('/sessions/:id/click', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { selector, button = 'left', clickCount = 1 } = req.body || {};
    if (!selector) return res.status(400).json({ success: false, error: 'selector fehlt' });
    await s.page.waitForSelector(selector, { timeout: 10000 });
    await s.page.click(selector, { button, clickCount });
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

app.post('/sessions/:id/type', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { selector, text, delay = 0 } = req.body || {};
    if (!selector) return res.status(400).json({ success: false, error: 'selector fehlt' });
    await s.page.waitForSelector(selector, { timeout: 10000 });
    await s.page.type(selector, String(text ?? ''), { delay: Number(delay) });
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

app.post('/sessions/:id/pressKey', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { key, selector } = req.body || {};
    if (!key) return res.status(400).json({ success: false, error: 'key fehlt' });
    if (selector) {
      await s.page.waitForSelector(selector, { timeout: 10000 });
      await s.page.focus(selector);
    }
    await s.page.keyboard.press(String(key));
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Evaluate
app.post('/sessions/:id/evaluate', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { expression, arg } = req.body || {};
    if (!expression) return res.status(400).json({ success: false, error: 'expression fehlt' });
    const result = await s.page.evaluate((code) => {
      try {
        // eslint-disable-next-line no-eval
        const value = eval(code);
        if (value && typeof value === 'object') {
          return { ok: true, value: structuredClone(value) };
        }
        return { ok: true, value };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }, String(expression), arg);
    updateActivity(s);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Content
app.get('/sessions/:id/content', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const html = await s.page.content();
    updateActivity(s);
    res.json({ success: true, url: s.page.url(), html });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Screenshot
app.post('/sessions/:id/screenshot', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { fullPage = true, path: outPath } = req.body || {};
    const buffer = await s.page.screenshot({ fullPage: !!fullPage, type: 'png' });
    let savedPath = null;
    if (outPath) {
      const abs = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buffer);
      savedPath = abs;
    }
    updateActivity(s);
    res.json({ success: true, base64: buffer.toString('base64'), savedPath });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Logs
app.get('/sessions/:id/logs/console', requireAuth, (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  updateActivity(s);
  res.json({ success: true, logs: s.consoleLogs });
});

app.get('/sessions/:id/logs/network', requireAuth, (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  updateActivity(s);
  res.json({ success: true, logs: s.networkLogs });
});

// Hover
app.post('/sessions/:id/hover', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { selector } = req.body || {};
    if (!selector) return res.status(400).json({ success: false, error: 'selector fehlt' });
    await s.page.waitForSelector(selector, { timeout: 10000 });
    await s.page.hover(selector);
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Scroll
app.post('/sessions/:id/scrollTo', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { x, y, selector } = req.body || {};
    if (selector) {
      await s.page.$eval(selector, (el) => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
    } else {
      await s.page.evaluate((x, y) => window.scrollTo(x ?? 0, y ?? 0), x, y);
    }
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Viewport
app.post('/sessions/:id/viewport', requireAuth, async (req, res) => {
  const s = ensureSession(req, res);
  if (!s) return;
  try {
    const { width, height, deviceScaleFactor = 1, isMobile = false } = req.body || {};
    if (!width || !height) return res.status(400).json({ success: false, error: 'width/height fehlen' });
    await s.page.setViewport({ width: Number(width), height: Number(height), deviceScaleFactor: Number(deviceScaleFactor), isMobile: !!isMobile });
    updateActivity(s);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
});

// Graceful shutdown
async function shutdown() {
  for (const [id] of sessions) {
    try { await closeSession(id); } catch (e) {console.error(e);}
  }
}
process.on('SIGINT', async () => { await shutdown(); process.exit(0); });
process.on('SIGTERM', async () => { await shutdown(); process.exit(0); });
process.on('exit', async () => { await shutdown(); });

app.listen(PORT, () => {
  console.log(`[web-mcp] Listening on http://localhost:${PORT}`);
  console.log(`[web-mcp] GET  /health`);
  console.log(`[web-mcp] GET  /tools`);
  console.log(`[web-mcp] POST /sessions  { url?, headless?, viewport?, userAgent? }`);
});
