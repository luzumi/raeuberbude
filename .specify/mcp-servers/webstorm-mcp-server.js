/*
  WebStorm Automation MCP (Windows)
  - Steuert WebStorm via Windows API & SendKeys über PowerShell (keine zusätzlichen NPM-Abhängigkeiten)
  - Bietet HTTP-Endpoints zum Fokussieren des WebStorm-Fensters und Senden von Tastenfolgen

  Hinweise
  - Funktioniert am stabilsten mit Standard-Keymap.
  - Nutzt COM (WScript.Shell) für SendKeys und user32.dll für Fokus.
  - Nur Windows.

  ENV (optional)
  - WEBSTORM_PROC=webstorm64  (Prozessname ohne .exe)
  - WEBSTORM_TITLE=WebStorm   (Fenstertitel-Fallback)
  - WEBSTORM_MCP_PORT=4212
*/

const express = require('express');
const { execFile } = require('node:child_process');

const PORT = Number(process.env.WEBSTORM_MCP_PORT || 4212);
const DEFAULT_PROC = process.env.WEBSTORM_PROC || 'webstorm64';
const DEFAULT_TITLE = process.env.WEBSTORM_TITLE || 'WebStorm';

const app = express();
app.use(express.json({ limit: '1mb' }));

function runPS(psCode, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCode],
      { windowsHide: true, timeout: timeoutMs },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(String(stdout || '').trim());
      }
    );
  });
}

function psEscapeSingleQuotes(s = '') { return String(s).replaceAll('\'', "''"); }

function buildFocusScript(procName = DEFAULT_PROC, titleFallback = DEFAULT_TITLE) {
  const pn = psEscapeSingleQuotes(procName);
  const tf = psEscapeSingleQuotes(titleFallback);
  return `
$proc = Get-Process -Name '${pn}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) {
  # Fallback: per Fenstertitel
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
  $hWnd = [WinAPI]::FindWindow($null, '${tf}')
  if ($hWnd -eq [IntPtr]::Zero) { Write-Output 'not-found'; exit 10 }
  [WinAPI]::ShowWindowAsync($hWnd, 3) | Out-Null
  Start-Sleep -Milliseconds 50
  [WinAPI]::SetForegroundWindow($hWnd) | Out-Null
  Write-Output 'ok'
  exit 0
}
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI2 {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
[WinAPI2]::ShowWindowAsync($proc.MainWindowHandle, 3) | Out-Null
Start-Sleep -Milliseconds 50
[WinAPI2]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Write-Output 'ok'
`;
}

function buildSendKeysScript(sequence) {
  const seq = psEscapeSingleQuotes(sequence);
  return `
$wshell = New-Object -ComObject wscript.shell
Start-Sleep -Milliseconds 30
$wshell.SendKeys('${seq}')
Write-Output 'ok'
`;
}

function buildTypeScript(text) {
  const t = psEscapeSingleQuotes(text);
  return `
$wshell = New-Object -ComObject wscript.shell
Start-Sleep -Milliseconds 10
$wshell.SendKeys('${t}')
Write-Output 'ok'
`;
}

function shortcutToSendKeys(keys = []) {
  // Map einfache Modifikatoren: CTRL(^), SHIFT(+), ALT(%)
  const mods = new Set();
  const rest = [];
  for (const k of keys) {
    const u = String(k || '').toUpperCase();
    if (u === 'CTRL' || u === 'CONTROL' || u === 'CMD' || u === 'COMMAND') mods.add('^');
    else if (u === 'SHIFT') mods.add('+');
    else if (u === 'ALT' || u === 'OPTION') mods.add('%');
    else if (/^F\d{1,2}$/.test(u)) rest.push(`{${u}}`);
    else if (u === 'ENTER' || u === 'RETURN') rest.push('{ENTER}');
    else if (u === 'ESC' || u === 'ESCAPE') rest.push('{ESC}');
    else if (u === 'TAB') rest.push('{TAB}');
    else if (u === 'SPACE' || u === 'SPACEBAR') rest.push(' ');
    else if (u.length === 1) rest.push(u);
    else rest.push(u); // Fallback roh
  }
  const prefix = Array.from(mods).join('');
  if (rest.length === 0) return prefix; // Nur Modifikatoren (ungewöhnlich)
  if (rest.length === 1) return prefix + rest[0];
  // Klammern fassen mehrere Tasten zusammen
  return prefix + '(' + rest.join('') + ')';
}

// Routes
app.get('/health', async (_req, res) => {
  try {
    const out = await runPS(`(Get-Process -Name '${psEscapeSingleQuotes(DEFAULT_PROC)}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1) -ne $null`);
    res.json({ ok: true, port: PORT, webstormRunning: /True/i.test(out.toString()) });
  } catch (e) {
    console.log(e);
    res.json({ ok: true, port: PORT, webstormRunning: false });
  }
});

app.get('/tools', (_req, res) => {
  res.json({
    name: 'webstorm-automation-mcp',
    description: 'Fokussiert WebStorm und sendet Tastatur-Eingaben über Windows',
    baseUrl: `http://localhost:${PORT}`,
    tools: [
      { name: 'focus', method: 'POST', path: '/webstorm/focus', schema: { processName: 'string?', titleFallback: 'string?' } },
      { name: 'sendKeys', method: 'POST', path: '/keys/send', schema: { sequence: 'string' } },
      { name: 'type', method: 'POST', path: '/keys/type', schema: { text: 'string' } },
      { name: 'shortcut', method: 'POST', path: '/keys/shortcut', schema: { keys: 'string[]' } },
      { name: 'openSonarToolWindow', method: 'POST', path: '/sequence/openSonar', schema: {} },
      { name: 'clipboardGet', method: 'GET', path: '/clipboard/get', schema: {} },
      { name: 'clipboardSet', method: 'POST', path: '/clipboard/set', schema: { text: 'string' } },
      { name: 'selectAllCopy', method: 'POST', path: '/sequence/selectAllCopy', schema: { delayMs: 'number?' } },
    ],
  });
});

app.post('/webstorm/focus', async (req, res) => {
  try {
    const proc = String(req.body?.processName || DEFAULT_PROC);
    const title = String(req.body?.titleFallback || DEFAULT_TITLE);
    const result = await runPS(buildFocusScript(proc, title));
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/keys/send', async (req, res) => {
  try {
    const sequence = String(req.body?.sequence || '');
    if (!sequence) return res.status(400).json({ success: false, error: 'sequence fehlt' });
    const result = await runPS(buildSendKeysScript(sequence));
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/keys/type', async (req, res) => {
  try {
    const text = String(req.body?.text || '');
    const result = await runPS(buildTypeScript(text));
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/keys/shortcut', async (req, res) => {
  try {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    if (!keys.length) return res.status(400).json({ success: false, error: 'keys[] fehlt' });
    const seq = shortcutToSendKeys(keys);
    const result = await runPS(buildSendKeysScript(seq));
    res.json({ success: true, result, sequence: seq });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/sequence/openSonar', async (_req, res) => {
  try {
    await runPS(buildFocusScript(DEFAULT_PROC, DEFAULT_TITLE));
    await runPS(buildSendKeysScript('^+A'));
    await new Promise(r => setTimeout(r, 200));
    await runPS(buildTypeScript('Sonar'));
    await new Promise(r => setTimeout(r, 150));
    await runPS(buildSendKeysScript('{ENTER}'));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Clipboard get
app.get('/clipboard/get', async (_req, res) => {
  try {
    const out = await runPS('Get-Clipboard -Raw');
    res.json({ success: true, text: out });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Clipboard set
app.post('/clipboard/set', async (req, res) => {
  try {
    const text = String(req.body?.text || '');
    const ps = `$text = @'\n${text}\n'@; Set-Clipboard -Value $text; Write-Output 'ok'`;
    const result = await runPS(ps);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Select all + copy (Ctrl+A, then Ctrl+C)
app.post('/sequence/selectAllCopy', async (req, res) => {
  try {
    const delayMs = Number(req.body?.delayMs || 120);
    await runPS(buildSendKeysScript('^A'));
    await new Promise(r => setTimeout(r, delayMs));
    await runPS(buildSendKeysScript('^C'));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[webstorm-mcp] Listening on http://localhost:${PORT}`);
  console.log(`[webstorm-mcp] POST /webstorm/focus { processName?, titleFallback? }`);
  console.log(`[webstorm-mcp] POST /keys/shortcut { keys: ["CTRL","SHIFT","A"] }`);
  console.log(`[webstorm-mcp] POST /sequence/openSonar`);
  console.log(`[webstorm-mcp] GET /clipboard/get`);
  console.log(`[webstorm-mcp] POST /clipboard/set { text: "string" }`);
  console.log(`[webstorm-mcp] POST /sequence/selectAllCopy { delayMs: number? }`);

});
