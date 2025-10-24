#!/usr/bin/env node
/*
  Automatische Issue-Erstellung (MCP) + Feature-Branch-Anlage
  Nutzung:
    node .specify/scripts/planner-auto-create.js "Header-Fix: Icons nebeneinander, responsive, moderne Farben"
*/

const { spawnSync } = require('node:child_process');
const axios = require('axios');

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(msg); }
function fail(msg) { console.error(msg); process.exit(1); }

function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function main() {
  const raw = process.argv.slice(2).join(' ').trim();
  if (!raw) fail('Bitte Summary angeben, z.B.: "Header-Fix: Icons nebeneinander, responsive, moderne Farben"');
  const summary = raw.replace(/\s--auto\b/, '').trim();

  const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:5180';

  const tasks = [
    'Implementierung auf separatem Branch',
    'Icons per Grid/Flex nebeneinander',
    'Responsive Breakpoints 1440/1024/768/375',
    'Farbvariablen (--header-bg, --header-fg) setzen',
    'Tests: Komponententests + E2E'
  ];
  const acceptance = [
    'Keine Überlappung bei Breakpoints',
    'Greet-Text < 960px ausgeblendet; Avatar/Name sichtbar',
    'Kontrast ausreichend',
    'Branch erstellt und PR vorbereitet'
  ];

  log('📨 Erzeuge YouTrack-Issue via MCP...');
  let issueId;
  try {
    const payload = {
      summary,
      type: 'Task',
      template: 'planner',
      meta: { feature: summary, intent: 'Umsetzung laut Planner', context: { source: 'planner', env: 'local' } },
      tasks,
      acceptanceCriteria: acceptance,
      commands: ['State To Do', 'Assignee me', 'tag Planning', 'tag Automation', 'tag Header']
    };
    const res = await axios.post(`${baseUrl}/issues`, payload, { headers: { 'Content-Type': 'application/json' } });
    issueId = res.data && (res.data.idReadable || res.data.id);
    if (!issueId) fail('IssueId konnte nicht ermittelt werden.');
    log(`✅ Issue erzeugt: ${issueId}`);
  } catch (e) {
    fail(`Issue-Erstellung fehlgeschlagen: ${e.message || e}`);
  }

  log('🌿 Erzeuge Feature-Branch...');
  const slug = slugify(summary);
  const branchName = `feature/${issueId}-${slug}`;

  function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf-8', ...opts });
    if (r.status !== 0) {
      throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
    }
    return r.stdout.trim();
  }

  try {
    // Basis-Branch priorisiert: develope-agents (Fallback: origin/default)
    let baseBranch = 'develope-agents';
    run('git', ['fetch', 'origin']);
    try {
      run('git', ['ls-remote', '--exit-code', '--heads', 'origin', baseBranch]);
    } catch {
      // origin default branch ermitteln
      baseBranch = 'main';
      try {
        const ref = run('git', ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
        const m = ref.match(/refs\/remotes\/origin\/(.+)$/);
        if (m && m[1]) baseBranch = m[1];
      } catch {
        try { run('git', ['ls-remote', '--exit-code', '--heads', 'origin', 'main']); baseBranch = 'main'; }
        catch { baseBranch = 'master'; }
      }
    }

    // Versuche Checkout, wenn lokale Änderungen blockieren -> einmal stashen und erneut
    try {
      run('git', ['checkout', '-b', branchName, `origin/${baseBranch}`]);
    } catch (e) {
      warn('Checkout blockiert (vermutlich lokale Änderungen). Versuche automatisches Stash...');
      try {
        run('git', ['stash', 'push', '-m', 'planner-auto-stash']);
        run('git', ['checkout', '-b', branchName, `origin/${baseBranch}`]);
      } catch (e2) {
        throw e2;
      }
    }
    run('git', ['push', '-u', 'origin', branchName]);
    log(`✅ Branch erstellt und gepusht: ${branchName}`);
  } catch (e) {
    warn(`⚠️ Branch-Erstellung/Push fehlgeschlagen: ${e.message}`);
    warn('Bitte Branch manuell anlegen und pushen.');
  }

  // Versuche, Link zum Branch auf GitHub zu ermitteln
  let branchUrl = '';
  try {
    const remoteUrl = run('git', ['remote', 'get-url', 'origin']);
    // gitea/github ssh/https -> https URL formen
    if (remoteUrl.startsWith('git@')) {
      const m = remoteUrl.match(/^git@([^:]+):(.+)\.git$/);
      if (m) branchUrl = `https://${m[1]}/${m[2]}/tree/${encodeURIComponent(branchName)}`;
    } else if (remoteUrl.startsWith('https://')) {
      const clean = remoteUrl.replace(/\.git$/, '');
      branchUrl = `${clean}/tree/${encodeURIComponent(branchName)}`;
    }
  } catch {}

  // Ticket aktualisieren: Status + Kommentar
  try {
    await axios.post(`${baseUrl}/issues/${encodeURIComponent(issueId)}/commands`, { query: 'State In Bearbeitung', silent: true }, { headers: { 'Content-Type': 'application/json' } });
    const lines = [
      '🪵 Branch angelegt und gepusht',
      `- Name: \
\`${branchName}\``,
      branchUrl ? `- Link: ${branchUrl}` : null
    ].filter(Boolean).join('\n');
    await axios.post(`${baseUrl}/issues/${encodeURIComponent(issueId)}/comments`, { text: lines }, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    warn(`Konnte Issue nicht aktualisieren: ${e.message || e}`);
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`Issue:   ${issueId}`);
  log(`Branch:  ${branchName}`);
  if (branchUrl) log(`Link:    ${branchUrl}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => fail(err.message || String(err)));
