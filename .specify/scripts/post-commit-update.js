#!/usr/bin/env node
/*
  Post-Commit Ticket Update
  - Liest aktuelle Branch- und Commit-Infos
  - Setzt State "In Bearbeitung"
  - Kommentiert Commit-Details
  - Erstellt After-Screenshots (1440/1024/768/375) und lädt sie als Attachments hoch

  Nutzung:
    node .specify/scripts/post-commit-update.js [ISSUE_ID optional] [ROUTE optional]
    # ISSUE_ID wird, falls nicht angegeben, aus dem Branch-Namen geparst (feature/<ID>-...)
*/

const { spawn, spawnSync } = require('node:child_process');
const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:5180';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf-8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

function parseIssueIdFromBranch(branch) {
  // e.g. feature/LUD28-45-header-...
  const m = branch.match(/([A-Za-z]+\d+-\d+)/);
  return m ? m[1] : null;
}

async function checkServer() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:4200', res => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { try { req.destroy(); } catch (e) {console.log(e);} resolve(false); });
  });
}

async function startDevServer() {
  const isAlive = await checkServer();
  if (isAlive) return { proc: null };
  const proc = spawn('npm', ['start'], { shell: true, stdio: 'pipe' });
  let ready = false; let buffer = '';
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { if (!ready) { ready = true; resolve({ proc }); } }, 60000);
    proc.stdout.on('data', d => {
      const t = d.toString(); buffer += t;
      if (!ready && (t.includes('compiled successfully') || t.includes('Compiled successfully') || t.includes('Local:') || t.includes('localhost:4200'))) {
        ready = true; clearTimeout(timeout); setTimeout(() => resolve({ proc }), 3000);
      }
    });
    proc.stderr.on('data', d => {
      const t = d.toString(); if (t.includes('ERROR')) console.error(t);
    });
  });
}

async function stopDevServer(proc) {
  if (proc && !proc.killed) {
    try { proc.kill(); } catch (e) {console.log(e);}
  }
}

async function uploadAttachment(issueId, file) {
  const abs = path.resolve(file);
  const res = await axios.post(`${BASE_URL}/issues/${encodeURIComponent(issueId)}/attachments-from-path`, { path: abs }, { headers: { 'Content-Type': 'application/json' } });
  return res.data?.attachment?.absoluteUrl || res.data?.attachment?.url || '';
}

async function main() {
  const args = process.argv.slice(2);
  let before = false;
  let argIssue = null;
  let route = '/';
  for (const a of args) {
    if (a === '--before') { before = true; continue; }
    if (a.startsWith('/')) { route = a; continue; }
    if (!argIssue) { argIssue = a; continue; }
    route = a;
  }

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const issueId = argIssue || parseIssueIdFromBranch(branch);
  if (!issueId) {
    console.error('❌ Konnte Issue-ID nicht ermitteln. Bitte als Argument übergeben.');
    process.exit(1);
  }

  // Commit-Infos
  let hash = 'before';
  let subject = '(before screenshots)';
  let author = run('git', ['config', 'user.name']) || '';
  let changed = [];
  if (!before) {
    hash = run('git', ['rev-parse', 'HEAD']).slice(0, 7);
    subject = run('git', ['log', '-1', '--pretty=%s']);
    author = run('git', ['log', '-1', '--pretty=%an']);
    changed = run('git', ['show', '--name-status', '--format=', 'HEAD']).split('\n').filter(Boolean);
  }

  // State + Kommentar
  try {
    await axios.post(`${BASE_URL}/issues/${encodeURIComponent(issueId)}/commands`, { query: 'State In Bearbeitung', silent: true }, { headers: { 'Content-Type': 'application/json' } });
    const header = before ? '🧩 Vorher-Zustand dokumentiert' : `🧩 Commit aktualisiert: ${hash}`;
    const details = before ? [`- Branch: ${branch}`] : [
      `- Titel: ${subject}`,
      `- Autor: ${author}`,
      `- Branch: ${branch}`,
      `- Dateien: ${changed.length}`,
      changed.slice(0, 20).map(l => `  - ${l}`).join('\n')
    ];
    const lines = [header, ...details].join('\n');
    await axios.post(`${BASE_URL}/issues/${encodeURIComponent(issueId)}/comments`, { text: lines }, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.warn('⚠️ Kommentar/Status fehlgeschlagen:', e.message || e);
  }

  // Screenshots (Before/After)
  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results', { recursive: true });
  let serverProc = null;
  // In BEFORE-Modus nur Screenshots, wenn der Dev-Server bereits läuft (keinen Commit verzögern)
  let canShoot = true;
  if (before) {
    canShoot = await checkServer();
  }
  if (!before || canShoot) {
    const started = await startDevServer();
    serverProc = started.proc;
  }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const widths = [1440, 1024, 768, 375];
  const uploaded = [];
  try {
    for (const w of widths) {
      await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
      await page.goto(`http://localhost:4200${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
      const file = `test-results/${issueId}-${hash}-${w}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const url = await uploadAttachment(issueId, file).catch(() => '');
      uploaded.push({ w, file, url });
    }
  } finally {
    await browser.close();
    await stopDevServer(serverProc);
  }

  // Screenshot-Kommentar
  try {
    const lines = [
      `📸 UI-Screenshots (${before ? 'Before' : 'After'})`,
      ...uploaded.map(u => `- ${path.basename(u.file)}${u.url ? ' → ' + u.url : ''}`)
    ].join('\n');
    await axios.post(`${BASE_URL}/issues/${encodeURIComponent(issueId)}/comments`, { text: lines }, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.warn('⚠️ Screenshot-Kommentar fehlgeschlagen:', e.message || e);
  }

  console.log('✅ Ticket aktualisiert.');
}

main().catch(err => { console.error('❌ Fehler:', err.message || err); process.exit(1); });
