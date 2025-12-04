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

(async function(){
  console.log('Connecting to Mongo', MONGO_URI);
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const coll = mongoose.connection.collection('ha_entities');
  const total = await coll.countDocuments();
  console.log('Mongo ha_entities count:', total);
  if (total === 0) { console.log('No documents, exiting'); await mongoose.disconnect(); return; }

  const conn = await mysql.createConnection(MYSQL_CFG);
  console.log('Connected to MariaDB');

  const cursor = coll.find().batchSize(500);
  const batch = [];
  let inserted = 0;
  const insertSQL = `INSERT INTO ha_entities (id, entity_id, entity_type, domain, object_id, friendly_name, device_id, area_id, created_at, updated_at) VALUES ?`;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const id = uuidv4();
    const entityId = doc.entityId || doc.entity_id || null;
    const entityType = doc.entityType || doc.entity_type || null;
    const domain = doc.domain || null;
    const objectId = doc.objectId || doc.object_id || null;
    const friendlyName = doc.friendlyName || doc.friendly_name || null;
    const deviceId = doc.deviceId || doc.device_id || null;
    const areaId = doc.areaId || doc.area_id || null;
    const createdAt = (doc.createdAt || doc.created_at) ? new Date(doc.createdAt || doc.created_at) : null;
    const updatedAt = (doc.updatedAt || doc.updated_at) ? new Date(doc.updatedAt || doc.updated_at) : null;
    batch.push([id, entityId, entityType, domain, objectId, friendlyName, deviceId, areaId, createdAt, updatedAt]);
    if (batch.length >= 500) {
      await conn.query(insertSQL, [batch]);
      inserted += batch.length;
      console.log('Inserted', inserted);
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    await conn.query(insertSQL, [batch]);
    inserted += batch.length;
  }

  console.log('Done. inserted total', inserted);
  await conn.end();
  await mongoose.disconnect();
})();

