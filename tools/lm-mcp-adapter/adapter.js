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
// If true, chat will error when model isn't loaded. If false (default), we send a minimal request without sampling params.
const REQUIRE_LOADED_FOR_CONFIG = (process.env.REQUIRE_LOADED_FOR_CONFIG || 'false').toLowerCase() === 'true';

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

function httpGetJson(urlString, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const opts = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      };
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const ct = res.headers['content-type'] || '';
            const parsed = ct.includes('application/json') ? JSON.parse(body) : body;
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) { resolve({ status: res.statusCode, body }); }
        });
      });
      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => { req.abort(); reject(new Error('Request timeout')); });
      req.end();
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
  socket.write(JSON.stringify({ type: 'response', id: msg.id || null, status: 'error', error: 'unknown-type' }) + '\n');
  log('Error: unknown type in controller message');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on('line', (line) => {
  if (!line?.trim()) return;

  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    const error = new Error(`Invalid JSON input: ${e.message}`);
    error.originalError = e;
    error.input = line;
    throw error;
  }

  if (parsed?.method === 'tools/call') {
    handleToolCall(parsed, (err, result) => {
      if (err) {
        writeErrorRpc(
          parsed.id || null,
          -32000,
          err.message || String(err),
          { raw: String(err) }
        );
        log('Error handling tool call:', err);
      } else {
        writeResultRpc(parsed.id || null, result);
      }
    });
  } else if (parsed?.id) {
    writeResultRpc(parsed.id, { ok: true });
  }
});

async function handleToolCall(rpc, cb) {
  const name = rpc.params?.name;
  const args = rpc.params?.arguments || {};

    logToolCall(name, args);
    notifyControllers(name, args);

    try {
        const result = await routeToolCall(name, args);
        cb(null, result);
    } catch (err) {
        cb(err);
    }
}

function logToolCall(name, args) {
    log('tools/call', name, JSON.stringify(args));
    sendToControllers(controllerClients, {
        type: 'event',
        event: 'incoming',
        payload: { name, args, ts: new Date().toISOString() }
    });
}

function notifyControllers(name, data) {
    sendToControllers(controllerClients, {
        type: 'event',
        event: 'incoming',
        payload: { name, args: data, ts: new Date().toISOString() }
    });
}

async function routeToolCall(name, args) {
    const handlers = {
        'list_models': handleListModels,
        'chat': handleChat,
        'load_model': handleModelOperation,
        'unload_model': handleModelOperation,
        'get_model_status': handleModelOperation
    };

    const handler = handlers[name] || handleUnknownTool;
    return handler(name, args);
}

async function handleListModels() {
    try {
        const url = new URL('/v1/models', LM_API_URL).toString();
        // /v1/models is a GET endpoint (OpenAI-compatible). POST may work on some servers but LM Studio expects GET.
        const resp = await httpGetJson(url, 8000);
        return resp.body || resp.status || { msg: 'no-data' };
    } catch (e) {
        return { error: 'failed-list', message: String(e) };
    }
}

async function handleChat(name, args) {
    const model = args.modelId || args.model || args.model_name;
    const loaded = await isModelLoaded(model).catch(() => null);

    const payload = buildChatPayload(args, { loaded });
    const urlCandidates = buildUrlCandidates();

    return tryChatEndpoints(urlCandidates, payload);
}

function buildChatPayload(args, { loaded } = {}) {
    const model = args.modelId || args.model || args.model_name;
    const messages = buildMessages(args);

    // Support both:
    //  - args.systemPrompt
    //  - system message already included in args.messages
    const systemPrompt = typeof args.systemPrompt === 'string' ? args.systemPrompt : undefined;
    const mergedMessages = injectSystemPrompt(messages, systemPrompt);

    const requestBody = {
        model: model || args.model,
        messages: mergedMessages,
        ...buildStreamField(args)
    };

    // IMPORTANT: only apply sampling/generation params when the model is loaded.
    // This matches the backend requirement (instance.isActive => apply config).
    const isLoaded = loaded === null ? false : !!loaded;
    if (!isLoaded) {
        if (REQUIRE_LOADED_FOR_CONFIG) {
            // Hard fail in strict mode.
            throw new Error(`Model not loaded: ${model}. Sampling/system config cannot be set when no active instance is loaded.`);
        }
        return requestBody;
    }

    const options = normalizeOptions(args);
    applySamplingOptions(requestBody, options);

    return requestBody;
}

function buildStreamField(args) {
    if (!args || typeof args !== 'object') return {};
    if (args.stream !== undefined) return { stream: !!args.stream };
    if (args.options && typeof args.options === 'object' && args.options.stream !== undefined) return { stream: !!args.options.stream };
    return {};
}

function applySamplingOptions(requestBody, options) {
    if (!requestBody || !options) return;

    // OpenAI-compatible snake_case
    if (options.temperature !== undefined) requestBody.temperature = options.temperature;
    if (options.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
    if (options.max_tokens !== undefined) requestBody.max_tokens = options.max_tokens;
    if (options.topP !== undefined) requestBody.top_p = options.topP;
    if (options.top_p !== undefined) requestBody.top_p = options.top_p;

    // LM Studio / llama.cpp extras (may be ignored if unsupported)
    if (options.topK !== undefined) requestBody.top_k = options.topK;
    if (options.top_k !== undefined) requestBody.top_k = options.top_k;
    if (options.repeatPenalty !== undefined) requestBody.repeat_penalty = options.repeatPenalty;
    if (options.repeat_penalty !== undefined) requestBody.repeat_penalty = options.repeat_penalty;
    if (options.minPSampling !== undefined) requestBody.min_p = options.minPSampling;
    if (options.min_p !== undefined) requestBody.min_p = options.min_p;
}

function injectSystemPrompt(messages, systemPrompt) {
    const safe = Array.isArray(messages) ? messages : [];
    const hasSystem = safe.some(m => (m && m.role === 'system'));
    if (hasSystem) return safe;
    if (!systemPrompt || !String(systemPrompt).trim()) return safe;
    return [{ role: 'system', content: String(systemPrompt) }, ...safe];
}

function normalizeOptions(args) {
    // Merge priority: explicit args.options overrides everything else.
    // Additionally accept snake_case for convenience.
    const fromArgs = args && typeof args === 'object' ? args : {};
    const opts = (fromArgs.options && typeof fromArgs.options === 'object') ? fromArgs.options : {};

    // Some callers pass options at root level (legacy).
    const legacy = {
        temperature: fromArgs.temperature,
        maxTokens: fromArgs.maxTokens,
        max_tokens: fromArgs.max_tokens,
        topP: fromArgs.topP,
        top_p: fromArgs.top_p,
        topK: fromArgs.topK,
        top_k: fromArgs.top_k,
        repeatPenalty: fromArgs.repeatPenalty,
        repeat_penalty: fromArgs.repeat_penalty,
        minPSampling: fromArgs.minPSampling,
        min_p: fromArgs.min_p,
        stream: fromArgs.stream,
    };

    return { ...legacy, ...opts };
}

async function isModelLoaded(modelId) {
    if (!modelId) return false;

    // Primary: LM Studio provides /v1/models (OpenAI-compatible). If model is present, we treat it as loaded.
    // Fallback: cannot reliably detect loaded state -> false.
    try {
        const url = new URL('/v1/models', LM_API_URL).toString();
        const resp = await httpGetJson(url, 8000);
        const ids = extractModelIds(resp.body);
        return ids.has(String(modelId));
    } catch (e) {
        return false;
    }
}

function extractModelIds(body) {
    const ids = new Set();

    let list = [];
    if (Array.isArray(body)) list = body;
    else if (body && Array.isArray(body.data)) list = body.data;

    for (const m of list) {
      const id = m && (m.id || m.model || m.name);
      if (id) ids.add(String(id));
    }
    return ids;
}

function buildMessages(args) {
    // Accept:
    //  - args.messages: already OpenAI format
    //  - args.prompt|input|text: user content
    if (args.messages) return args.messages;
    const content = args.prompt || args.input || args.text || '';
    return [{ role: 'user', content }];
}

function buildUrlCandidates() {
    const baseUrl = LM_API_URL;
    return [
        new URL('/v1/chat/completions', baseUrl).toString(),
        // Keep completions as fallback only; some deployments support both.
        new URL('/v1/completions', baseUrl).toString()
    ];
}

async function tryChatEndpoints(urlCandidates, payload) {
    for (const url of urlCandidates) {
        try {
            const resp = await httpPostJson(url, payload);
            notifyChatResponse(url, resp);
            return resp.body || resp.status;
        } catch (e) {
            // Continue to next URL
        }
    }
    throw new Error('Chat failed on all endpoints');
}

function notifyChatResponse(url, response) {
    sendToControllers(controllerClients, {
        type: 'event',
        event: 'chat_response',
        payload: { url, resp: response.body }
    });
}

async function handleModelOperation(name, args) {
    if (!USE_CLI) {
        return {
            message: 'CLI not enabled. Set USE_CLI=true to allow model operations via lms CLI'
        };
    }

    const commands = {
        'load_model': `lms load "${args.modelId || args.model || ''}"`,
        'unload_model': `lms unload "${args.modelId || args.model || ''}"`,
        'get_model_status': `lms status "${args.modelId || args.model || ''}"`
    };

    const cmd = commands[name];
    return new Promise((resolve, reject) => {
        exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
            const output = {
                stdout: stdout?.trim(),
                stderr: stderr?.trim()
            };

            sendToControllers(controllerClients, {
                type: 'event',
                event: 'cli_output',
                payload: { cmd, ...output }
            });

            if (err) return reject(err);
            resolve(stdout ? output : { ok: true });
        });
    });
}

function handleUnknownTool(name) {
    return { message: `unknown tool: ${name}` };
}

process.on('SIGINT', () => { log('SIGINT - shutting down'); server.close(); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM - shutting down'); server.close(); process.exit(0); });

