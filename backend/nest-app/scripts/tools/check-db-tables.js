const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');

// DB connection defaults from data-source.ts
const config = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

async function getExpectedCollections() {
  const dir = path.join(__dirname, '../src/modules/homeassistant/schemas');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
  const collections = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = content.match(/collection:\s*'([^']+)'/);
    if (m) collections.push(m[1]);
  }
  return collections;
}

(async function main(){
  try {
    const expected = await getExpectedCollections();
    const conn = await mysql.createConnection(config);
    const [rows] = await conn.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?", [config.database]);
    const existing = rows.map(r => r.TABLE_NAME);
    console.log('DB:', config.database);
    console.log('Connection OK. Found tables:', existing.length);
    const present = expected.filter(e => existing.includes(e));
    const missing = expected.filter(e => !existing.includes(e));
    console.log('\nExpected HA collections from schemas (' + expected.length + '):');
    console.log(expected.join(', '));
    console.log('\nPresent in DB:', present.length);
    console.log(present.join(', ') || '(none)');
    console.log('\nMissing in DB:', missing.length);
    console.log(missing.join(', ') || '(none)');
    await conn.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(2);
  }
})();

