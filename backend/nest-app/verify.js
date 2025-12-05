const mysql = require('mysql2/promise');

async function verify() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'rb_user',
    password: 'rb_user_secret',
    database: 'raueberbude'
  });

  const tables = ['keywords', 'suggestions', 'transcript_keywords', 'transcript_suggestions', 'intent_log_keywords'];

  console.log('Checking tables...\n');

  for (const table of tables) {
    const [rows] = await conn.query(`SHOW TABLES LIKE '${table}'`);
    if (rows.length > 0) {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
      console.log(`✓ ${table} (${cols.length} columns)`);
    } else {
      console.log(`✗ ${table} NOT FOUND`);
    }
  }

  await conn.end();
}

verify().catch(console.error);

