export function createMcpServer(deps) {
    // Minimaler stdio-basierten MCP-JSON-RPC-Server
    async function handleRequest(request) {
        const { method, params, id } = request || {};

        if (method === 'initialize') {
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'lmstudio-admin', version: '0.1.0' }
                }
            };
        }

        if (method === 'tools/list') {
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    tools: [
                        {
                            name: 'list_models',
                            description: 'List loaded models in LM Studio (proxy)',
                            inputSchema: { type: 'object', properties: {}, required: [] }
                        },
                        {
                            name: 'get_status',
                            description: 'Get server status',
                            inputSchema: { type: 'object', properties: {}, required: [] }
                        }
                    ]
                }
            };
        }

        // tools/call - basic dispatch to services if available
        if (method === 'tools/call') {
            const toolName = params?.name;
            const args = params?.arguments || {};

            try {
                switch (toolName) {
                    case 'list_models':
                        if (deps?.modelService?.list) {
                            const models = await deps.modelService.list();
                            return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(models) }] } };
                        }
                        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'list_models not implemented' } };
                    case 'get_status':
                        const status = { uptime: process.uptime(), pid: process.pid };
                        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(status) }] } };
                    default:
                        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
                }
            } catch (err) {
                return { jsonrpc: '2.0', id, error: { code: -32603, message: err && err.message ? err.message : String(err) } };
            }
        }

        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }

    return {
        async start() {
            deps.logger?.info('MCP-Server (stdio) wird gestartet');

            // Reserve stdout for JSON-RPC responses. Use stderr for logs.
            process.stdin.setEncoding('utf8');
            let buffer = '';

            process.stdin.on('data', async (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    let req;
                    try {
                        req = JSON.parse(line);
                    } catch (err) {
                        deps.logger?.error('Ungültige JSON-RPC Anfrage:', err);
                        continue;
                    }

                    try {
                        const res = await handleRequest(req);
                        process.stdout.write(JSON.stringify(res) + '\n');
                    } catch (err) {
                        const out = { jsonrpc: '2.0', id: req?.id, error: { code: -32603, message: String(err) } };
                        process.stdout.write(JSON.stringify(out) + '\n');
                    }
                }
            });

            // Keep start() fast: return immediately after wiring listeners so Promise.all in index.js doesn't hang.
            return;
        }
    };
}
