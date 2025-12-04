const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

const BATCH_SIZE = 500;

function safeTableName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

(async function main(){
  console.log('Connect to Mongo:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;

  const conn = await mysql.createConnection(MYSQL_CFG);
  console.log('Connected to MariaDB', MYSQL_CFG.host + ':' + MYSQL_CFG.port);

  const collections = await db.listCollections().toArray();
  console.log('Found collections:', collections.map(c=>c.name).join(', '));

  for (const c of collections) {
    const collName = c.name;
    const table = safeTableName(collName);
    console.log(`\n--- Processing collection '${collName}' -> table '${table}'`);

    const createSql = `CREATE TABLE IF NOT EXISTS \`${table}\` (
      id CHAR(36) NOT NULL,
      mongo_id VARCHAR(24) NOT NULL,
      data JSON NULL,
      created_at DATETIME NULL,
      updated_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY ux_mongo_id (mongo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

    try { await conn.query(createSql); } catch (e) { console.error('Failed to create table', table, e.message); continue; }

    const mongoColl = db.collection(collName);
    const total = await mongoColl.countDocuments();
    console.log(`Total documents in ${collName}: ${total}`);
    if (total === 0) continue;

    const cursor = mongoColl.find().batchSize(BATCH_SIZE);
    let batch = [];
    let processed = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const id = uuidv4();
      const mongo_id = doc._id ? doc._id.toString() : null;
      const created_at = doc.createdAt || doc.created_at || null;
      const updated_at = doc.updatedAt || doc.updated_at || null;
      const data = JSON.stringify(doc);
      batch.push([id, mongo_id, data, created_at, updated_at]);

      if (batch.length >= BATCH_SIZE) {
        const placeholders = batch.map(()=>'(?,?,?,?,?)').join(',');
        const flat = batch.flat();
        const insertSql = `INSERT INTO \`${table}\` (id, mongo_id, data, created_at, updated_at) VALUES ${placeholders} ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=VALUES(updated_at)`;
        try { await conn.query(insertSql, flat); } catch (e) { console.error('Batch insert error for', table, e.message); }
        processed += batch.length;
        console.log(`  inserted/upserted ${processed}/${total}`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      const placeholders = batch.map(()=>'(?,?,?,?,?)').join(',');
      const flat = batch.flat();
      const insertSql = `INSERT INTO \`${table}\` (id, mongo_id, data, created_at, updated_at) VALUES ${placeholders} ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=VALUES(updated_at)`;
      try { await conn.query(insertSql, flat); } catch (e) { console.error('Final batch insert error for', table, e.message); }
      processed += batch.length;
      console.log(`  inserted/upserted ${processed}/${total}`);
    }

    console.log(`Finished collection ${collName} -> table ${table} (processed ${processed})`);
  }

  await conn.end();
  await mongoose.disconnect();
  console.log('\nAll done.');
})();

