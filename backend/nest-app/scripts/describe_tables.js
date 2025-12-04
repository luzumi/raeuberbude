const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

const tables = ['app_users','app_terminals','categories','llm_instances','transcripts','intent_logs'];

(async ()=>{
  const conn = await mysql.createConnection(cfg);
  for (const t of tables) {
    try {
      const [rows] = await conn.query(`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, [cfg.database, t]);
      console.log('\n=== ' + t + ' ===');
      if (!rows.length) { console.log('(table not found)'); continue; }
      for (const r of rows) console.log(r.COLUMN_NAME + '\t' + r.COLUMN_TYPE + '\t' + r.IS_NULLABLE + '\t' + (r.COLUMN_DEFAULT===null?'<NULL>':r.COLUMN_DEFAULT));
    } catch (e) {
      console.log('\n=== ' + t + ' ===');
      console.log('ERROR:', e.message);
    }
  }
  await conn.end();
})();

