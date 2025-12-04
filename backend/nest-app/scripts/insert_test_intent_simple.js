const mysql = require('mysql2/promise');
(async ()=>{
  const cfg = { host: '127.0.0.1', port: 3307, user: 'rb_user', password: 'rb_user_secret', database: 'raueberbude' };
  const conn = await mysql.createConnection(cfg);
  try {
    const sql = 'INSERT INTO intent_logs (id, transcript, confidence, `timestamp`, terminal_id, created_at, intent, summary, keywords) VALUES (?,?,?,?,?,?,?,?,?)';
    const vals = ['insert-test-1','hello test',0.42,'2025-11-20 16:39:48','term-1','2025-11-20 16:39:48','intent-test','summary','["kw"]'];
    const [res] = await conn.query(sql, vals);
    console.log('OK affectedRows=', res.affectedRows);
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await conn.end();
  }
})();
// Stub: archived test script
console.log('insert_test_intent_simple.js archived. See scripts/archive/original-scripts.json');
