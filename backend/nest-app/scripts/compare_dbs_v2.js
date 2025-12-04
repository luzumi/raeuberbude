const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const fs = require('fs');

const outFile = 'compare_result_v2.json';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function(){
  const result = { mongo: {}, mariadb: {}, summary: {}, errors: [] };
  try{
    console.log('Connecting to Mongo...');
    await mongoose.connect(MONGO_URI, { autoIndex: false });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Found', collections.length, 'collections in Mongo');
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
    console.log('Connecting to MariaDB...');
    const conn = await mysql.createConnection(MYSQL_CFG);
    const [rows] = await conn.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?', [MYSQL_CFG.database]);
    const tables = rows.map(r=>r.TABLE_NAME);
    console.log('Found', tables.length, 'tables in MariaDB');
    for(const t of tables){
      try{
        const [r] = await conn.query('SELECT COUNT(*) as c FROM `'+t+'`');
        result.mariadb[t] = r[0].c;
      }catch(e){ result.mariadb[t] = 'ERROR:'+e.message; result.errors.push(`mysql:${t}:${e.message}`); }
    }
    await conn.end();
  }catch(e){ console.error('MySQL error', e.message); result.mariadbError = e.message; result.errors.push('mysql_connect:'+e.message); }

  const mongoKeys = Object.keys(result.mongo).sort();
  const mariadbKeys = Object.keys(result.mariadb).sort();
  result.summary.missingInMariadb = mongoKeys.filter(k => !mariadbKeys.includes(k));
  result.summary.missingInMongo = mariadbKeys.filter(k => !mongoKeys.includes(k));

  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log('Wrote', outFile);

  // Print short summary
  console.log('\nSummary:');
  console.log('Collections in Mongo:', mongoKeys.length);
  console.log('Tables in MariaDB:', mariadbKeys.length);
  console.log('Missing in MariaDB (from Mongo):', result.summary.missingInMariadb.length);
  if (result.summary.missingInMariadb.length) console.log(result.summary.missingInMariadb.join(', '));
  console.log('Missing in Mongo (from MariaDB):', result.summary.missingInMongo.length);
  if (result.summary.missingInMongo.length) console.log(result.summary.missingInMongo.join(', '));

  process.exit(0);
})();

