const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function main(){
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  const collections = await db.listCollections().toArray();
  const result = {};

  for (const c of collections) {
    const collName = c.name;
    const table = collName.replace(/[^a-zA-Z0-9_]/g,'_');
    const mongoCount = await db.collection(collName).countDocuments();

    let mariadbCount = null;
    try {
      const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      mariadbCount = rows[0].cnt;
    } catch (e) {
      mariadbCount = null;
    }

    result[collName] = { mongo: mongoCount, mariadb: mariadbCount };
    console.log(`${collName}: mongo=${mongoCount}, mariadb=${mariadbCount}`);
  }

  await conn.end();
  await mongoose.disconnect();

  fs.writeFileSync('compare_result_final3.json', JSON.stringify(result, null, 2));
  console.log('Wrote compare_result_final3.json');
})();

