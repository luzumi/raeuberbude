#!/usr/bin/env node
// LM Studio MCP Adapter (stdio JSON-RPC) + simple TCP controller bridge
// Usage: node adapter.js
// Env:
//  LM_API_URL - base URL of LM Studio HTTP API (e.g. http://localhost:8080)
//  TCP_PORT - port for controller TCP bridge (default 3002)
//  USE_CLI - if 'true', adapter will attempt to run `lms` CLI for load/unload commands

const readline = require('node:readline');
const { URL } = require('node:url');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { exec } = require('node:child_process');
const fs = require('node:fs');

const LM_API_URL = process.env.LM_API_URL || process.env.LM_STUDIO_BASE || 'http://localhost:8080';
const TCP_PORT = Number.parseInt(process.env.TCP_PORT || '3002', 10);
const USE_CLI = (process.env.USE_CLI || 'false').toLowerCase() === 'true';
const LOGFILE = process.env.MCP_ADAPTER_LOG || (process.env.TEMP ? `${process.env.TEMP}/lm-mcp-adapter.log` : null);

function log(...args) {
  const line = `[adapter] ${new Date().toISOString()} ` + args.join(' ');
  if (LOGFILE) fs.appendFileSync(LOGFILE, line + '\n');
  else console.error(line);
}

function writeStdout(obj) {
  try { process.stdout.write(JSON.stringify(obj) + '\n'); } catch (e) { log('failed to write stdout JSON', e); }
}

function writeErrorRpc(id, code, message, data) { writeStdout({ jsonrpc: '2.0', id, error: { code, message, data } }); }
function writeResultRpc(id, resultPayload) { const out = { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: typeof resultPayload === 'string' ? resultPayload : JSON.stringify(resultPayload) }] } }; writeStdout(out); }

function sendToControllers(clients, obj) {
  const line = JSON.stringify(obj) + '\n';
  for (const c of clients) {
    try { c.write(line); } catch (e) { /* ignore */ }
  }
}

function httpPostJson(urlString, payload, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = JSON.stringify(payload);
      const opts = { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + (url.search || ''), method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try { const ct = res.headers['content-type'] || ''; const parsed = ct.includes('application/json') ? JSON.parse(body) : body; resolve({ status: res.statusCode, body: parsed }); } catch (e) { resolve({ status: res.statusCode, body }); }
        });
      });
      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => { req.abort(); reject(new Error('Request timeout')); });
      req.write(data); req.end();
    } catch (e) { reject(e); }
  });
}

const controllerClients = new Set();
const server = net.createServer((socket) => {
  socket.setEncoding('utf8'); controllerClients.add(socket);
  socket.write(JSON.stringify({ type: 'event', event: 'connected', payload: { ts: new Date().toISOString() } }) + '\n');
  log('Controller connected');
  socket.on('data', (data) => {
    const lines = data.split('\n').filter(Boolean);
    for (const line of lines) {
      try { const msg = JSON.parse(line); handleControllerMessage(socket, msg); } catch (e) { socket.write(JSON.stringify({ type: 'response', id: null, status: 'error', error: 'invalid-json', message: String(e) }) + '\n'); }
    }
  });
  socket.on('close', () => { controllerClients.delete(socket); log('Controller disconnected'); });
  socket.on('error', () => { controllerClients.delete(socket); });
});
server.listen(TCP_PORT, () => log('TCP controller bridge listening on port', TCP_PORT));

function handleControllerMessage(socket, msg) {
  if (!msg || !msg.type) { socket.write(JSON.stringify({ type: 'response', id: msg && msg.id || null, status: 'error', error: 'missing-type' }) + '\n'); return; }
  if (msg.type === 'command') { const id = msg.id || null; const cmd = msg.command; const payload = msg.payload || {}; handleToolCall({ id, params: { name: cmd, arguments: payload } }, (err, result) => { if (err) socket.write(JSON.stringify({ type: 'response', id, status: 'error', error: err.message || String(err) }) + '\n'); else socket.write(JSON.stringify({ type: 'response', id, status: 'ok', payload: result }) + '\n'); }); return; }
  if (msg.type === 'chat') { const id = msg.id || null; handleToolCall({ id, params: { name: 'chat', arguments: msg.payload || {} } }, (err, result) => { if (err) socket.write(JSON.stringify({ type: 'response', id, status: 'error', error: err.message || String(err) }) + '\n'); else socket.write(JSON.stringify({ type: 'response', id, status: 'ok', payload: result }) + '\n'); }); return; }
  socket.write(JSON.stringify({ type: 'response', id: msg.id || null, status: 'error', error: 'unknown-type' }) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on('line', (line) => {
  if (!line || !line.trim()) return; let parsed; try { parsed = JSON.parse(line); } catch (e) { log('invalid json from stdin:', line); return; }
  if (parsed && parsed.method === 'tools/call') { handleToolCall(parsed, (err, result) => { if (err) writeErrorRpc(parsed.id || null, -32000, err.message || String(err), { raw: String(err) }); else writeResultRpc(parsed.id || null, result); }); } else { if (parsed && parsed.id) writeResultRpc(parsed.id, { ok: true }); }
});

async function handleToolCall(rpc, cb) {
  const name = rpc.params && rpc.params.name; const args = (rpc.params && rpc.params.arguments) || {};
  log('tools/call', name, JSON.stringify(args)); sendToControllers(controllerClients, { type: 'event', event: 'incoming', payload: { name, args, ts: new Date().toISOString() } });
  try {
    if (name === 'list_models') {
      try { const url = new URL('/v1/models', LM_API_URL).toString(); const resp = await httpPostJson(url, {}); cb(null, resp.body || resp.status || { msg: 'no-data' }); } catch (e) { cb(null, { error: 'failed-list', message: String(e) }); }
      return;
    }
    if (name === 'chat') {
      const model = args.modelId || args.model || args.model_name || args.modelId;
      const messages = args.messages || (args.prompt ? [{ role: 'user', content: args.prompt }] : [{ role: 'user', content: args.input || args.text || '' }]);
      const payload = { model: model || args.model, messages };
      if (args.options && args.options.temperature !== undefined) payload.temperature = args.options.temperature;
      const urlCandidates = [new URL('/v1/chat/completions', LM_API_URL).toString(), new URL('/v1/completions', LM_API_URL).toString()];
      let lastErr = null;
      for (const url of urlCandidates) {
        try { const resp = await httpPostJson(url, payload); sendToControllers(controllerClients, { type: 'event', event: 'chat_response', payload: { url, resp: resp.body } }); cb(null, resp.body || resp.status); return; } catch (e) { lastErr = e; }
      }
      cb(new Error('chat failed: ' + String(lastErr)));
      return;
    }
    if (name === 'load_model' || name === 'unload_model' || name === 'get_model_status') {
      if (USE_CLI) {
        const cmd = name === 'load_model' ? `lms load "${args.modelId || args.model || ''}"` : name === 'unload_model' ? `lms unload "${args.modelId || args.model || ''}"` : `lms status "${args.modelId || args.model || ''}"`;
        exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => { sendToControllers(controllerClients, { type: 'event', event: 'cli_output', payload: { cmd, stdout, stderr } }); if (err) return cb(err); try { cb(null, { stdout: stdout.trim(), stderr: stderr.trim() }); } catch (e) { cb(null, { ok: true }); } });
      } else { cb(null, { message: 'CLI not enabled. Set USE_CLI=true to allow load/unload via lms CLI, or use controller to call LM HTTP API directly.' }); }
      return;
    }
    cb(null, { message: 'unknown tool: ' + name });
  } catch (err) { cb(err); }
}

process.on('SIGINT', () => { log('SIGINT - shutting down'); server.close(); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM - shutting down'); server.close(); process.exit(0); });

