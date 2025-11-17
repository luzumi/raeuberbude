// javascript
// Datei: `scripts/serve-network.js`
// Startet frontend, backend und mcpserver. Wenn `SSL_CERT` und `SSL_KEY` gesetzt sind,
// startet frontend mit --ssl true. Andernfalls startet zusätzlich ngrok für ein gültiges TLS.

const { spawn, exec } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const certPath = process.env.SSL_CERT;
const keyPath = process.env.SSL_KEY;
const useNgrok = process.env.USE_NGROK === '1' || (!certPath || !keyPath);

function joinArgs(args) {
  return args.map(a => {
    if (/\s/.test(a)) return `"${a}"`;
    return a;
  }).join(' ');
}

// Diagnostic: test that spawn/exec works by running `node -v` synchronously
function diagnosticTest() {
  try {
    const sync = require('child_process').spawnSync('node', ['-v'], { encoding: 'utf8' });
    console.log('Diagnostic: node -v =>', sync.stdout && sync.stdout.trim());
    if (sync.error) console.log('Diagnostic spawnSync error:', sync.error);
  } catch (e) {
    console.error('Diagnostic test failed:', e);
  }
}

diagnosticTest();

// New: start process using shell on Windows; fallback to exec on spawn EINVAL
function startProcess(p) {
  if (!fs.existsSync(p.cwd)) {
    console.error(`Skipping ${p.name}: cwd not found: ${p.cwd}`);
    return null;
  }

  const useShell = isWin || p.useShell;
  const cmdStr = [p.cmd].concat(p.args || []).map(a => `${a}`).join(' ');

  if (useShell) {
    console.log(`Spawning (shell): ${cmdStr} (cwd: ${p.cwd})`);
    try {
      const child = spawn(cmdStr, { cwd: p.cwd, stdio: 'inherit', shell: true });
      child.on('exit', code => console.log(`${p.name} exited with ${code}`));
      child.on('error', err => console.error(`${p.name} failed:`, err));
      return child;
    } catch (err) {
      console.error(`Failed to spawn ${p.name} (shell) - error details:`, { message: err.message, code: err.code, errno: err.errno, syscall: err.syscall });
      // Fallback to exec (also uses shell)
      try {
        console.log(`Falling back to exec for ${p.name}: ${cmdStr}`);
        const child = exec(cmdStr, { cwd: p.cwd });
        child.stdout && child.stdout.pipe(process.stdout);
        child.stderr && child.stderr.pipe(process.stderr);
        child.on('exit', code => console.log(`${p.name} (exec) exited with ${code}`));
        child.on('error', e => console.error(`${p.name} (exec) failed:`, e));
        return child;
      } catch (e) {
        console.error(`Exec fallback also failed for ${p.name}:`, e);
        return null;
      }
    }
  }

  // non-shell spawn (POSIX)
  try {
    console.log(`Spawning: ${p.cmd} ${joinArgs(p.args || [])} (cwd: ${p.cwd})`);
    const child = spawn(p.cmd, p.args || [], { cwd: p.cwd, stdio: 'inherit' });
    child.on('exit', code => console.log(`${p.name} exited with ${code}`));
    child.on('error', err => console.error(`${p.name} failed:`, err));
    return child;
  } catch (err) {
    console.error(`Failed to spawn ${p.name}:`, err);
    return null;
  }
}

const processes = [];

// frontend command (ng serve ...), add --ssl if certs provided
const frontendArgs = ['ng', 'serve', '--host', '0.0.0.0', '--port', '4301'];
if (certPath && keyPath) {
  frontendArgs.push('--ssl', 'true', '--ssl-cert', certPath, '--ssl-key', keyPath);
}

const frontendCwd = path.resolve(__dirname, '..');
processes.push({
  name: 'frontend',
  cmd: npxCmd,
  args: frontendArgs,
  cwd: frontendCwd,
  useShell: true
});

// backend (Nest) - passe ggf. das Script an
const backendCwd = path.resolve(__dirname, '..', 'backend', 'nest-app');
processes.push({
  name: 'backend',
  cmd: npmCmd,
  args: ['run', 'start:dev'],
  cwd: backendCwd,
  useShell: false
});

// mcpserver - passe ggf. Script/Ordner an
const mcpCwd = path.resolve(__dirname, '..', '.specify', 'mcp-servers');
processes.push({
  name: 'mcpserver',
  cmd: npmCmd,
  args: ['run', 'all'],
  cwd: mcpCwd,
  useShell: false
});

const children = [];
for (const p of processes) {
  console.log(`Starting ${p.name} (cwd: ${p.cwd})...`);
  const child = startProcess(p);
  if (child) children.push(child);
}

// falls kein eigenes Zertifikat gesetzt ist oder USE_NGROK=1, starte ngrok
let ngrokChild = null;
if (useNgrok) {
  console.log('No SSL cert/key found or USE_NGROK requested — starting ngrok for HTTPS...');
  try {
    if (isWin) {
      ngrokChild = startProcess({ name: 'ngrok', cmd: npxCmd, args: ['ngrok', 'http', '4301'], cwd: frontendCwd, useShell: true });
    } else {
      // prefer local ngrok binary if present
      const ngrokCmd = resolveLocalBin ? resolveLocalBin('ngrok', frontendCwd) : 'ngrok';
      ngrokChild = startProcess({ name: 'ngrok', cmd: ngrokCmd, args: ['http', '4301'], cwd: frontendCwd, useShell: false });
    }

    if (ngrokChild) children.push(ngrokChild);

    if (ngrokChild && ngrokChild.stdout) {
      const rl = readline.createInterface({ input: ngrokChild.stdout });
      rl.on('line', line => console.log('[ngrok] ' + line));
      ngrokChild.stderr.on('data', d => console.error('[ngrok-err] ' + d.toString()));
    }
  } catch (e) {
    console.error('Failed to spawn ngrok:', e);
  }
}

// clean shutdown on CTRL+C
const shutdown = () => {
  console.log('Shutting down children...');
  for (const c of children) {
    if (!c.killed) {
      try { c.kill('SIGINT'); } catch (e) { console.log(e); }
    }
  }
  setTimeout(() => process.exit(0), 500);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
