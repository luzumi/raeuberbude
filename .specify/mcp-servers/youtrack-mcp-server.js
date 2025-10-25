const express = require('express');
const axios = require('axios');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
app.use(express.json());

const { YOU_TRACK_API_URL, TOKEN } = (() => {
  const envUrl = process.env.YOUTRACK_SERVER_URL;
  const envToken = process.env.YOUTRACK_API_TOKEN;
  try {
    const secretsPath = path.resolve(__dirname, 'youtrack.secrets.json');
    if (!envUrl || !envToken) {
      if (fs.existsSync(secretsPath)) {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8')) || {};
        return {
          YOU_TRACK_API_URL: envUrl || secrets.YOUTRACK_SERVER_URL || secrets.url || 'https://luzumi.youtrack.cloud',
          TOKEN: envToken || secrets.YOUTRACK_API_TOKEN || secrets.token || ''
        };
      }
    }
  } catch (_) {
    // ignore secrets parsing errors; fall back to env/defaults
  }
  return {
    YOU_TRACK_API_URL: envUrl || 'https://luzumi.youtrack.cloud',
    TOKEN: envToken || ''
  };
})();

function normalizedToken() {
  const t = TOKEN || '';
  return t.startsWith('perm-') ? t.replace(/^perm-/, 'perm:') : t;
}

async function resolveProjectId(inputProject, axiosOpts) {
  // inputProject: may be { id }, { shortName }, string, or undefined
  if (inputProject && typeof inputProject === 'object' && inputProject.id) {
    return inputProject.id;
  }
  let shortName = undefined;
  if (inputProject && typeof inputProject === 'object' && inputProject.shortName) {
    shortName = inputProject.shortName;
  } else if (typeof inputProject === 'string' && inputProject.length > 0) {
    // If format like 'LUD-28' or 'LUD28', take leading letters as shortName
    const m = inputProject.match(/^[A-Za-z]+/);
    if (m) shortName = m[0];
  }
  if (!shortName) {
    shortName = process.env.YOUTRACK_PROJECT_SHORTNAME || 'LUD28';
  }
  // Fetch projects and find by shortName (fallback to admin API if needed)
  let list;
  try {
    list = await axios.get(`${YOU_TRACK_API_URL}/api/projects?fields=id,shortName,name`, axiosOpts).then(r => r.data);
  } catch (err) {
    if (err.response?.status === 404) {
      list = await axios.get(`${YOU_TRACK_API_URL}/api/admin/projects?fields=id,shortName,name`, axiosOpts).then(r => r.data);
    } else {
      throw err;
    }
  }
  const found = Array.isArray(list) ? list.find(p => p.shortName === shortName) : undefined;
  if (!found) {
    throw new Error(`Projekt mit shortName='${shortName}' nicht gefunden`);
  }
  return found.id;
}

function buildRichDescription(body = {}) {
  const template = body.template || 'generic';
  const meta = body.meta || {};
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  const ac = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [];
  const notes = body.notes || '';
  const lines = [];
  // Ziel
  if (meta.feature || meta.intent) {
    lines.push('## Ziel');
    const title = meta.feature ? `- ${meta.feature}` : '';
    const intent = meta.intent ? ` – ${meta.intent}` : '';
    lines.push(`${title}${intent}`.trim());
    lines.push('');
  }
  // Aufgaben
  if (tasks.length) {
    lines.push('## Aufgaben');
    for (const t of tasks) lines.push(`- [ ] ${t}`);
    lines.push('');
  }
  // Akzeptanzkriterien
  if (ac.length) {
    lines.push('## Akzeptanzkriterien');
    for (const a of ac) lines.push(`- ${a}`);
    lines.push('');
  }
  // Kontext
  const context = meta.context || {};
  const ctxKeys = Object.keys(context);
  if (ctxKeys.length) {
    lines.push('## Kontext');
    for (const k of ctxKeys) lines.push(`- ${k}: ${context[k]}`);
    lines.push('');
  }
  if (notes) {
    lines.push('---');
    lines.push(String(notes));
    lines.push('');
  }
  lines.push(`_Automatisch erstellt (${template}) – ${new Date().toISOString()}_`);
  return lines.join('\n');
}

app.post('/issues', async (req, res) => {
  try {
    const { summary } = req.body;
    const axiosOpts = {
      headers: {
        Authorization: `Bearer ${normalizedToken()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    };
    const projectId = await resolveProjectId(req.body?.project, axiosOpts).catch(() => process.env.YOUTRACK_PROJECT_ID || undefined);
    if (!projectId) {
      // letztes Fallback: versuche via shortName aus ENV
      const pid = await resolveProjectId(process.env.YOUTRACK_PROJECT_SHORTNAME || 'LUD', axiosOpts);
      if (!pid) throw new Error('Konnte keine Projekt-ID ermitteln');

    }
    const chosenType = (req.body && req.body.type) || process.env.YOUTRACK_DEFAULT_TYPE || 'ISSUE';
    const customFields = req.body.customFields || req.body.fields || [
      {
        name: 'Type',
        $type: 'SingleEnumIssueCustomField',
        value: { name: chosenType }
      }
    ];

    const resolvedProjectId = projectId || await resolveProjectId(process.env.YOUTRACK_PROJECT_SHORTNAME || 'LUD', axiosOpts);
    const description = req.body.description || buildRichDescription(req.body);
    const payload = { project: { id: resolvedProjectId }, summary, description, customFields };

    if (process.env.LOG_REQUESTS === 'true') {
      const { Authorization, ...safeHeaders } = { Authorization: `Bearer ${normalizedToken()}` };
      console.log('[YouTrack] Request', {
        method: 'POST', url: `${YOU_TRACK_API_URL}/api/issues`, headers: safeHeaders, payload
      });
    }

    const response = await axios.post(`${YOU_TRACK_API_URL}/api/issues?fields=id,idReadable,summary`, payload, axiosOpts);
    if (process.env.LOG_REQUESTS === 'true') {
      console.log('[YouTrack] Response', { status: response.status, data: { id: response.data?.id, summary: response.data?.summary } });
    }
    const created = { id: response.data.id, idReadable: response.data.idReadable, summary: response.data.summary };
    // Initial commands
    if (Array.isArray(req.body.commands) && req.body.commands.length) {
      const cmd = req.body.commands.join(' ');
      try {
        await axios.post(`${YOU_TRACK_API_URL}/api/commands`, { query: cmd, issues: [{ idReadable: created.idReadable }], silent: true }, axiosOpts);
      } catch (e) {
        console.warn('Init commands failed:', e.response?.data || e.message);
      }
    }
    // Optional initial comment
    if (req.body.initialComment) {
      try {
        await axios.post(`${YOU_TRACK_API_URL}/api/issues/${encodeURIComponent(created.idReadable)}/comments`, { text: req.body.initialComment }, axiosOpts);
      } catch (e) {
        console.warn('Init comment failed:', e.response?.data || e.message);
      }
    }
    res.json(created);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { message: error.message };
    console.error('Fehler beim Erstellen der Issue:', data);
    res.status(status).json({ success: false, error: data, status });
  }
});

// Alias-Endpunkt kompatibel zu früherer Verwendung
app.post('/createIssue', async (req, res) => {
  try {
    const { summary } = req.body;
    const axiosOpts = {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    };
    const projectId = await resolveProjectId(req.body?.project, axiosOpts).catch(() => process.env.YOUTRACK_PROJECT_ID || undefined);
    const chosenType = (req.body && req.body.type) || process.env.YOUTRACK_DEFAULT_TYPE || 'ISSUE';
    const customFields = req.body.customFields || req.body.fields || [
      {
        name: 'Type',
        $type: 'SingleEnumIssueCustomField',
        value: { name: chosenType }
      }
    ];

    const resolvedProjectId = projectId || await resolveProjectId(process.env.YOUTRACK_PROJECT_SHORTNAME || 'LUD', axiosOpts);
    const description = req.body.description || buildRichDescription(req.body);
    const payload = { project: { id: resolvedProjectId }, summary, description, customFields };

    if (process.env.LOG_REQUESTS === 'true') {
      const { Authorization, ...safeHeaders } = { Authorization: `Bearer ${TOKEN}` };
      console.log('[YouTrack] Request', {
        method: 'POST', url: `${YOU_TRACK_API_URL}/api/issues`, headers: safeHeaders, payload
      });
    }

    const response = await axios.post(`${YOU_TRACK_API_URL}/api/issues?fields=id,idReadable,summary`, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    });
    const created = { id: response.data.id, idReadable: response.data.idReadable, summary: response.data.summary };
    res.json(created);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { message: error.message };
    res.status(status).json({ success: false, error: data, status });
  }
});

// Apply a command to a single issue (e.g., "State In Bearbeitung", tags, assignee)
app.post('/issues/:issueId/commands', async (req, res) => {
  try {
    const issueId = req.params.issueId;
    const { query, comment, silent = true } = req.body || {};
    const axiosOpts = {
      headers: {
        Authorization: `Bearer ${normalizedToken()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    };
    const payload = { issues: [{ idReadable: issueId }], query: query || '', silent: !!silent };
    // YouTrack /api/commands erwartet `comment` als String, nicht als Objekt
    if (comment) payload.comment = String(comment);
    const response = await axios.post(`${YOU_TRACK_API_URL}/api/commands`, payload, axiosOpts);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { message: error.message };
    res.status(status).json({ success: false, error: data, status });
  }
});

// Post a comment to an issue
app.post('/issues/:issueId/comments', async (req, res) => {
  try {
    const issueId = req.params.issueId;
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, error: 'Missing comment text' });
    }
    const axiosOpts = {
      headers: {
        Authorization: `Bearer ${normalizedToken()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    };
    const response = await axios.post(`${YOU_TRACK_API_URL}/api/issues/${encodeURIComponent(issueId)}/comments`, { text }, axiosOpts);
    res.json({ success: true, comment: response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { message: error.message };
    res.status(status).json({ success: false, error: data, status });
  }
});

// Upload an attachment from a local path (simplified client)
app.post('/issues/:issueId/attachments-from-path', async (req, res) => {
  try {
    const issueId = req.params.issueId;
    const filePath = req.body?.path || req.body?.filePath;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Missing path/filePath in body' });
    }
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, error: `File not found: ${abs}` });
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(abs), path.basename(abs));
    const response = await axios.post(
      `${YOU_TRACK_API_URL}/api/issues/${encodeURIComponent(issueId)}/attachments?fields=id,name,url,extension,size`,
      form,
      {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${normalizedToken()}` },
        httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined,
        maxBodyLength: Infinity
      }
    );
    const a = response.data;
    res.json({ success: true, attachment: { id: a.id, name: a.name, size: a.size, url: a.url, absoluteUrl: a.url } });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { message: error.message };
    res.status(status).json({ success: false, error: data, status });
  }
});

const PORT = process.env.PORT || 5180;
app.listen(PORT, () => {
  console.log(`YouTrack MCP Server listening on port ${PORT}`);
  console.log(`POST /issues       -> ${YOU_TRACK_API_URL}/api/issues`);
  console.log(`POST /createIssue  -> ${YOU_TRACK_API_URL}/api/issues`);
});

// Simple health endpoint
app.get('/health', (_req, res) => {
  res.json({ ok: true, youtrack: YOU_TRACK_API_URL });
});
