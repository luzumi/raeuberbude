/*
  SonarQube MCP Server
  - HTTP API für SonarQube-Daten (Issues, Hotspots, Quality Gate, Measures)
  - Nutzt die SonarQube Web API

  ENV Variablen (optional):
   - SONAR_MCP_PORT=4211
   - SONAR_HOST_URL=http://localhost:9000
   - SONAR_TOKEN=xxxxx (Personal Access Token)
   - SONAR_INSECURE_TLS=true|false (bei selbstsignierten Zertifikaten)

  Alternativ kann eine Datei sonarqube.secrets.json neben diesem Script liegen:
  {
    "SONAR_HOST_URL": "http://sonarqube.local:9000",
    "SONAR_TOKEN": "xxxxx"
  }
*/

const express = require('express');
const axios = require('axios');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
try { require('dotenv').config(); } catch (e) {console.log(e);}

function readSecrets() {
  try {
    const p = path.resolve(__dirname, 'sonarqube.secrets.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch (e) {console.log(e);}
  return {};
}

const secrets = readSecrets();
const PORT = Number(process.env.SONAR_MCP_PORT || 4211);
const SONAR_HOST_URL = (process.env.SONAR_HOST_URL || secrets.SONAR_HOST_URL || 'http://localhost:9000').replace(/\/$/, '');
const SONAR_TOKEN = process.env.SONAR_TOKEN || secrets.SONAR_TOKEN || '';
const INSECURE = String(process.env.SONAR_INSECURE_TLS || 'false').toLowerCase() === 'true';

const app = express();
app.use(express.json({ limit: '5mb' }));

function authHeaders() {
  if (!SONAR_TOKEN) return {};
  const basic = Buffer.from(`${SONAR_TOKEN}:`).toString('base64');
  return { Authorization: `Basic ${basic}` };
}

function axiosOpts() {
  return {
    headers: { 'Accept': 'application/json', ...authHeaders() },
    httpsAgent: INSECURE ? new https.Agent({ rejectUnauthorized: false }) : undefined,
  };
}

// Basic Health
app.get('/health', (_req, res) => {
  res.json({ ok: true, port: PORT, sonar: SONAR_HOST_URL, auth: !!SONAR_TOKEN });
});

// Tool Discovery
app.get('/tools', (_req, res) => {
  res.json({
    name: 'sonarqube-mcp',
    description: 'Liest SonarQube Issues, Hotspots, Quality Gate und Metriken',
    baseUrl: `http://localhost:${PORT}`,
    tools: [
      { name: 'projects', method: 'GET', path: '/projects', schema: { q: 'string?', p: 'number?', ps: 'number?', organization: 'string?' } },
      { name: 'issues', method: 'GET', path: '/issues', schema: { projectKey: 'string', severities: 'string?', types: 'string?', statuses: 'string?', p: 'number?', ps: 'number?' } },
      { name: 'hotspots', method: 'GET', path: '/hotspots', schema: { projectKey: 'string', status: 'string?', resolution: 'string?' } },
      { name: 'qualitygate', method: 'GET', path: '/qualitygate', schema: { projectKey: 'string' } },
      { name: 'measures', method: 'GET', path: '/measures', schema: { component: 'string', metricKeys: 'string' } },
      { name: 'rule', method: 'GET', path: '/rule', schema: { key: 'string' } },
    ],
  });
});

// Projects: /api/projects/search – liefert Keys und Namen
app.get('/projects', async (req, res) => {
  try {
    const { q, p = 1, ps = 100, organization } = req.query;
    const params = new URLSearchParams();
    if (q) params.set('q', String(q));
    params.set('p', String(p));
    params.set('ps', String(ps));
    if (organization) params.set('organization', String(organization));
    const url = `${SONAR_HOST_URL}/api/projects/search?${params.toString()}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

// Issues: /api/issues/search
app.get('/issues', async (req, res) => {
  try {
    const { projectKey, componentKeys, severities, types, statuses, p = 1, ps = 100 } = req.query;
    if (!projectKey && !componentKeys) return res.status(400).json({ success: false, error: 'projectKey oder componentKeys erforderlich' });
    const params = new URLSearchParams();
    if (projectKey) params.set('projectKeys', String(projectKey));
    if (componentKeys) params.set('componentKeys', String(componentKeys));
    if (severities) params.set('severities', String(severities));
    if (types) params.set('types', String(types));
    if (statuses) params.set('statuses', String(statuses));
    params.set('p', String(p));
    params.set('ps', String(ps));
    const url = `${SONAR_HOST_URL}/api/issues/search?${params.toString()}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

// Hotspots: /api/hotspots/search
app.get('/hotspots', async (req, res) => {
  try {
    const { projectKey, status, resolution, p = 1, ps = 100 } = req.query;
    if (!projectKey) return res.status(400).json({ success: false, error: 'projectKey erforderlich' });
    const params = new URLSearchParams();
    params.set('projectKey', String(projectKey));
    if (status) params.set('status', String(status));
    if (resolution) params.set('resolution', String(resolution));
    params.set('p', String(p));
    params.set('ps', String(ps));
    const url = `${SONAR_HOST_URL}/api/hotspots/search?${params.toString()}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

// Quality Gate: /api/qualitygates/project_status
app.get('/qualitygate', async (req, res) => {
  try {
    const { projectKey } = req.query;
    if (!projectKey) return res.status(400).json({ success: false, error: 'projectKey erforderlich' });
    const url = `${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=${encodeURIComponent(String(projectKey))}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

// Measures: /api/measures/component
app.get('/measures', async (req, res) => {
  try {
    const { component, metricKeys } = req.query;
    if (!component || !metricKeys) return res.status(400).json({ success: false, error: 'component und metricKeys erforderlich' });
    const url = `${SONAR_HOST_URL}/api/measures/component?component=${encodeURIComponent(String(component))}&metricKeys=${encodeURIComponent(String(metricKeys))}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

// Rule: /api/rules/show
app.get('/rule', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ success: false, error: 'key erforderlich' });
    const url = `${SONAR_HOST_URL}/api/rules/show?key=${encodeURIComponent(String(key))}`;
    const data = await axios.get(url, axiosOpts()).then(r => r.data);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || { message: error.message }, status });
  }
});

app.listen(PORT, () => {
  console.log(`[sonarqube-mcp] Listening on http://localhost:${PORT}`);
  console.log(`[sonarqube-mcp] SONAR_HOST_URL=${SONAR_HOST_URL}`);
  console.log(`[sonarqube-mcp] GET  /health`);
  console.log(`[sonarqube-mcp] GET  /tools`);
  console.log(`[sonarqube-mcp] GET  /issues?projectKey=YOUR_KEY&severities=BLOCKER,CRITICAL&types=BUG,CODE_SMELL&statuses=OPEN`);
  console.log(`[sonarqube-mcp] GET  /qualitygate?projectKey=YOUR_KEY`);
  console.log(`[sonarqube-mcp] GET  /measures?component=YOUR_KEY&metricKeys=code_smells,bugs,vulnerabilities`);
});
