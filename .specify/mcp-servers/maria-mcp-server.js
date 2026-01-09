/**
 * MariaDB MCP Server (stdio JSON-RPC)
 *
 * LM Studio/Claude Desktop erwarten MCP über stdin/stdout (one JSON-RPC message per line).
 * Dieses Skript bietet einfache Tools für MariaDB.
 */

const mysql = require('mysql2/promise');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3307',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_DATABASE = 'test',
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
});

async function checkDb() {
  await pool.query('SELECT 1');
}

async function listTables() {
  const [rows] = await pool.query('SHOW TABLES');
  return rows.map((r) => Object.values(r)[0]).filter(Boolean);
}

function assertSelectOnly(sql) {
  const trimmed = String(sql || '').trim();
  if (!trimmed) throw new Error('SQL is empty');

  // Block multiple statements, comments, and most write ops (simple guard).
  if (trimmed.includes(';')) throw new Error('Multiple statements are not allowed');

  const low = trimmed.toLowerCase();
  const forbidden = [
    'insert ', 'update ', 'delete ', 'drop ', 'alter ', 'create ', 'truncate ', 'grant ', 'revoke ',
    'replace ', 'call ', 'lock ', 'unlock ', 'set ', 'rename ',
  ];
  if (forbidden.some((kw) => low.startsWith(kw))) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Allow WITH ... SELECT ...
  if (!(low.startsWith('select ') || low.startsWith('with '))) {
    throw new Error('Only SELECT queries are allowed');
  }

  return trimmed;
}

async function runSelectQuery(sql, params) {
  const safeSql = assertSelectOnly(sql);
  const [rows] = await pool.query(safeSql, Array.isArray(params) ? params : []);
  return rows;
}

function ok(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleRequest(request) {
  const { method, params, id } = request || {};

  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'mariaDB', version: '1.0.0' },
    });
  }

  if (method === 'tools/list') {
    return ok(id, {
      tools: [
        {
          name: 'health_check',
          description: 'Checks DB connectivity (SELECT 1).',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'list_tables',
          description: 'Lists tables in the current database.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'query',
          description: 'Runs a SELECT-only query and returns rows (safety-guarded).',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SELECT query (no semicolons, no writes).' },
              params: { type: 'array', description: 'Optional positional parameters.' },
              limit: { type: 'number', description: 'Optional max row count (default 200).' },
            },
            required: ['sql'],
          },
        },
      ],
    });
  }

  if (method !== 'tools/call') {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }

  const toolName = params?.name;
  const args = params?.arguments || {};

  try {
    let payload;
    switch (toolName) {
      case 'health_check':
        await checkDb();
        payload = { ok: true };
        break;
      case 'list_tables':
        payload = { tables: await listTables() };
        break;
      case 'query': {
        const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(5000, Number(args.limit))) : 200;
        const rows = await runSelectQuery(args.sql, args.params);
        payload = { rows: Array.isArray(rows) ? rows.slice(0, limit) : rows };
        break;
      }
      default:
        return rpcError(id, -32601, `Unknown tool: ${toolName}`);
    }

    return ok(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload),
        },
      ],
    });
  } catch (err) {
    return rpcError(id, -32603, err && err.message ? err.message : String(err));
  }
}

async function main() {
  // Minimal Start-Log auf stderr (stdout ist reserviert für JSON-RPC)
  console.error(
    `[mariaDB MCP] starting pid=${process.pid} host=${DB_HOST} db=${DB_DATABASE} port=${DB_PORT}`
  );

  process.stdin.setEncoding('utf8');
  let buffer = '';

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (e) {
        console.error('[mariaDB MCP] failed to parse/handle request:', e);
      }
    }
  });

  process.stdin.on('end', async () => {
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(0);
  });
}

await main();
