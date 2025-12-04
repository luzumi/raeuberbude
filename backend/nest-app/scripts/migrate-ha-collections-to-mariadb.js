const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

async function getCollectionsFromSchemas() {
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

function mongoDocToJson(doc) {
  // remove mongoose-specific fields if present
  if (!doc) return null;
  const copy = Object.assign({}, doc);
  // convert _id to string
  if (copy._id) copy._id = copy._id.toString();
  return copy;
}

async function migrate() {
  console.log('Connect to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const mysqlConn = await mysql.createConnection(MYSQL_CFG);
  console.log('Connected to MariaDB', MYSQL_CFG.host + ':' + MYSQL_CFG.port);

  const collections = await getCollectionsFromSchemas();
  console.log('Found schema collections:', collections.join(', '));

  for (const coll of collections) {
    console.log('\n=== Migrating collection', coll, '===');
    const mongoColl = mongoose.connection.collection(coll);
    const count = await mongoColl.countDocuments();
    console.log('Mongo documents:', count);
    if (count === 0) {
      console.log('No documents, skip');
      continue;
    }

    // Determine target table and special columns
    const table = coll; // same name
    let insertSQL = null;

    if (coll === 'ha_entity_states') {
      insertSQL = `INSERT INTO \`${table}\` (id, mongo_id, entity_id, state, created_at, updated_at) VALUES ?`;
    } else if (coll === 'ha_entity_attributes') {
      insertSQL = `INSERT INTO \`${table}\` (id, mongo_id, entity_id, data, created_at, updated_at) VALUES ?`;
    } else if (coll === 'ha_services') {
      insertSQL = `INSERT INTO \`${table}\` (id, mongo_id, service, data, created_at, updated_at) VALUES ?`;
    } else {
      insertSQL = `INSERT INTO \`${table}\` (id, mongo_id, data, created_at, updated_at) VALUES ?`;
    }

    const cursor = mongoColl.find().batchSize(500);
    const batch = [];
    let inserted = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const json = mongoDocToJson(doc);
      const id = uuidv4();
      const mongo_id = json._id || null;
      const created_at = json.createdAt ? new Date(json.createdAt) : null;
      const updated_at = json.updatedAt ? new Date(json.updatedAt) : null;

      if (coll === 'ha_entity_states') {
        const entityId = json.entityId || json.entity_id || null;
        const state = JSON.stringify(json);
        batch.push([id, mongo_id, entityId, state, created_at, updated_at]);
      } else if (coll === 'ha_entity_attributes') {
        const entityId = json.entityId || json.entity_id || null;
        batch.push([id, mongo_id, entityId, JSON.stringify(json), created_at, updated_at]);
      } else if (coll === 'ha_services') {
        const service = json.service || null;
        batch.push([id, mongo_id, service, JSON.stringify(json), created_at, updated_at]);
      } else {
        batch.push([id, mongo_id, JSON.stringify(json), created_at, updated_at]);
      }

      if (batch.length >= 200) {
        const [res] = await mysqlConn.query(insertSQL, [batch]);
        inserted += batch.length;
        console.log('Inserted batch', inserted);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await mysqlConn.query(insertSQL, [batch]);
      inserted += batch.length;
    }

    console.log(`Done. Inserted approx ${inserted} rows into ${table}`);
  }

  await mysqlConn.end();
  await mongoose.disconnect();
  console.log('\nMigration completed.');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(2);
});

