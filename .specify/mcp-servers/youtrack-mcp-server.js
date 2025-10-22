const express = require('express');
const axios = require('axios');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
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

app.post('/issues', async (req, res) => {
  try {
    const { summary, description } = req.body;
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
    const payload = { project: { id: resolvedProjectId }, summary, description, customFields };

    if (process.env.LOG_REQUESTS === 'true') {
      const { Authorization, ...safeHeaders } = { Authorization: `Bearer ${normalizedToken()}` };
      console.log('[YouTrack] Request', {
        method: 'POST', url: `${YOU_TRACK_API_URL}/api/issues`, headers: safeHeaders, payload
      });
    }

    const response = await axios.post(`${YOU_TRACK_API_URL}/api/issues`, payload, axiosOpts);
    if (process.env.LOG_REQUESTS === 'true') {
      console.log('[YouTrack] Response', { status: response.status, data: { id: response.data?.id, summary: response.data?.summary } });
    }
    res.json({ id: response.data.id, ...response.data });
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
    const { summary, description } = req.body;
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
    const payload = { project: { id: resolvedProjectId }, summary, description, customFields };

    if (process.env.LOG_REQUESTS === 'true') {
      const { Authorization, ...safeHeaders } = { Authorization: `Bearer ${TOKEN}` };
      console.log('[YouTrack] Request', {
        method: 'POST', url: `${YOU_TRACK_API_URL}/api/issues`, headers: safeHeaders, payload
      });
    }

    const response = await axios.post(`${YOU_TRACK_API_URL}/api/issues`, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: process.env.YOUTRACK_INSECURE_TLS === 'true' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    });
    res.json({ id: response.data.id, ...response.data });
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
