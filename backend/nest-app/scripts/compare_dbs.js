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

(async ()=>{
  const result = { mongo: {}, mariadb: {}, summary: {}, errors: [] };
  try{
    await mongoose.connect(MONGO_URI, { autoIndex: false });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for(const c of collections){
      const name = c.name;
      try{
        const col = db.collection(name);
        const count = await col.countDocuments();
        result.mongo[name] = count;
      }catch(e){ result.mongo[name] = 'ERROR:'+e.message; result.errors.push(`mongo:${name}:${e.message}`); }
    }
    await mongoose.disconnect();
  }catch(e){ console.error('Mongo error', e.message); result.mongoError = e.message; result.errors.push('mongo_connect:'+e.message); }

  try{
    const conn = await mysql.createConnection(MYSQL_CFG);
    const [rows] = await conn.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?', [MYSQL_CFG.database]);
    const tables = rows.map(r=>r.TABLE_NAME);
    for(const t of tables){
      try{
        const [r] = await conn.query('SELECT COUNT(*) as c FROM `'+t+'`');
        result.mariadb[t] = r[0].c;
      }catch(e){ result.mariadb[t] = 'ERROR:'+e.message; result.errors.push(`mysql:${t}:${e.message}`); }
    }
    await conn.end();
  }catch(e){ console.error('MySQL error', e.message); result.mariadbError = e.message; result.errors.push('mysql_connect:'+e.message); }

  // Summary: list collections present in mongo but missing in mariadb and vice versa
  const mongoKeys = Object.keys(result.mongo);
  const mariadbKeys = Object.keys(result.mariadb);
  result.summary.missingInMariadb = mongoKeys.filter(k => !mariadbKeys.includes(k));
  result.summary.missingInMongo = mariadbKeys.filter(k => !mongoKeys.includes(k));

  try{
    fs.writeFileSync('compare_result.json', JSON.stringify(result, null, 2));
    console.log('Wrote compare_result.json');
  }catch(e){ console.error('Failed to write compare_result.json', e.message); }
})();
