const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const fs = require('fs');

const outPath = 'backend/nest-app/logs/ha_entities_counts.json';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function(){
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  try {
    const mongoCount = await db.collection('ha_entities').countDocuments();
    const [totalRows] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities');
    const total = totalRows[0].cnt;
    const [distinctRows] = await conn.query("SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IS NOT NULL");
    const distinct = distinctRows[0].cnt;

    const result = { mongoCount, mariadb: { total, distinct } };
    fs.mkdirSync('backend/nest-app/logs', { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log('Wrote', outPath);
  } catch (e) {
    console.error('Error', e.message || e);
    process.exitCode = 2;
  } finally {
    await conn.end();
    await mongoose.disconnect();
  }
})();

