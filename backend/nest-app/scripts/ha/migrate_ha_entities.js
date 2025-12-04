#!/usr/bin/env node
/**
 * Migrate ha_entities from MongoDB to MariaDB (batched upserts)
 */
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

const BATCH = 200;

(async ()=>{
  console.log('Migrate ha_entities: connect');
  console.log('Connecting to MongoDB and MariaDB with config', { host: MYSQL_CFG.host, port: MYSQL_CFG.port, database: MYSQL_CFG.database });
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  try {
    const total = await db.collection('ha_entities').countDocuments();
    console.log('Mongo ha_entities total:', total);

    const cursor = db.collection('ha_entities').find().batchSize(BATCH);
    let batch = [];
    let migrated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const row = {
        id: doc.id || uuidv4(),
        entity_id: doc.entity_id || doc.entityId || (doc.object_id ? doc.object_id : (doc._id ? doc._id.toString() : null)),
        friendly_name: doc.attributes && doc.attributes.friendly_name ? doc.attributes.friendly_name : (doc.friendly_name || null),
        device_class: doc.attributes && doc.attributes.device_class ? doc.attributes.device_class : null,
        area: doc.area || null,
        domain: doc.domain || null,
        platform: doc.platform || null,
        unique_id: doc.unique_id || null,
        supported_features: doc.supported_features || null,
        entity_category: doc.entity_category || null,
        capabilities: doc.capabilities ? JSON.stringify(doc.capabilities) : (doc.attributes ? JSON.stringify(doc.attributes) : null),
        original_name: doc.original_name || null,
        object_id: doc.object_id || null,
        entity_type: doc.entity_type || null,
        device_id: doc.device_id || null,
        area_id: doc.area_id || null,
        created_at: doc.createdAt || doc.created_at || new Date(),
        updated_at: doc.updatedAt || doc.updated_at || new Date(),
      };

      batch.push(row);

      if (batch.length % 50 === 0) console.log('Queued', batch.length, 'rows (migrated so far:', migrated, ')');

      if (batch.length >= BATCH) {
        // upsert per entity_id
        for (const r of batch) {
          const keys = Object.keys(r).filter(k => r[k] !== undefined);
          const placeholders = `(${keys.map(()=>'?').join(',')})`;
          const sql = `INSERT INTO ` + '\`ha_entities\`' + ` (${keys.map(k=>`\`${k}\``).join(',')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${keys.filter(k=>k!=='entity_id').map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(',')}`;
          const vals = keys.map(k=>r[k]);
          console.log('UPSERT preview -> entity_id=', r.entity_id, 'cols=', keys.length, 'sample vals=', vals.slice(0,5).map(v => (typeof v === 'string' && v.length>80)? v.substring(0,80)+'...': v));
          try { await conn.query(sql, vals); migrated++; } catch(e){ console.error('Upsert error for', r.entity_id, e.message); }
        }
        console.log('Migrated', migrated, '/', total);
        console.log('Sleeping 100ms to avoid overload');
        await new Promise(r=>setTimeout(r,100));
        batch = [];
      }
    }

    if (batch.length) {
      for (const r of batch) {
        const keys = Object.keys(r).filter(k => r[k] !== undefined);
        const placeholders = `(${keys.map(()=>'?').join(',')})`;
        const sql = `INSERT INTO ` + '\`ha_entities\`' + ` (${keys.map(k=>`\`${k}\``).join(',')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${keys.filter(k=>k!=='entity_id').map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(',')}`;
        const vals = keys.map(k=>r[k]);
        console.log('UPSERT preview -> entity_id=', r.entity_id, 'cols=', keys.length, 'sample vals=', vals.slice(0,5).map(v => (typeof v === 'string' && v.length>80)? v.substring(0,80)+'...': v));
        try { await conn.query(sql, vals); migrated++; } catch(e){ console.error('Upsert error for', r.entity_id, e.message); }
      }
    }

    console.log('Done migrate ha_entities. migrated=', migrated);
  } catch(e) {
    console.error('Error migrating ha_entities:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
    await mongoose.disconnect();
  }
})();

