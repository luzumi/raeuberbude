const http = require('node:http');

const {
  MCP_HOST = '127.0.0.1',
  MCP_PORT = '3001'
} = process.env;

function get(path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: MCP_HOST, port: Number(MCP_PORT), path, timeout }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, body: raw });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function main() {
  console.log(`Prüfe MCP-Server: http://${MCP_HOST}:${MCP_PORT}/health`);
  const health = await get('/health');
  if (health.statusCode !== 200) {
    throw new Error('MCP /health returned ' + health.statusCode + ' - ' + health.body);
  }
  console.log('MCP /health: ok');

  console.log(`Hole Tabellen über http://${MCP_HOST}:${MCP_PORT}/tables`);
  const tablesRes = await get('/tables');
  if (tablesRes.statusCode !== 200) {
    throw new Error('/tables returned ' + tablesRes.statusCode + ' - ' + tablesRes.body);
  }

  let parsed;
  try {
    parsed = JSON.parse(tablesRes.body);
  } catch (e) {
    throw new Error('Ungültiges JSON von /tables: ' + tablesRes.body);
  }

  const tables = parsed && parsed.tables;
  if (!Array.isArray(tables) || tables.length === 0) {
    console.log('Keine Tabellen gefunden.');
  } else {
    console.log('Tabellen:');
    tables.forEach(t => console.log('- ' + t));
  }
}

try {
    await main();
} catch (err) {
    console.error('Fehler:', err && err.message);
    process.exitCode = 1;
}

