const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function(){
  console.log('Connect to Mongo and MariaDB');
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  try {
    const mongoCount = await db.collection('ha_entities').countDocuments();
    console.log('Mongo ha_entities count =', mongoCount);

    const [totalRows] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities');
    const total = totalRows[0].cnt;
    const [distinctRows] = await conn.query("SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IS NOT NULL");
    const distinct = distinctRows[0].cnt;

    console.log(`MariaDB ha_entities: total=${total}, distinct_entity_id=${distinct}`);

    if (total === 0) {
      console.log('MariaDB ha_entities empty — nothing to dedupe.');
    }

    if (total > distinct) {
      console.log('Duplicates detected in MariaDB. Starting dedupe...');

      const [dups] = await conn.query("SELECT entity_id, COUNT(*) as cnt FROM ha_entities WHERE entity_id IS NOT NULL GROUP BY entity_id HAVING cnt > 1");
      console.log('Duplicate entity_id count:', dups.length);

      for (const r of dups) {
        const entityId = r.entity_id;
        // select the id to keep
        const [keepRows] = await conn.query(
          `SELECT id FROM ha_entities WHERE entity_id = ? ORDER BY COALESCE(updated_at, created_at, '1970-01-01') DESC, id DESC LIMIT 1`,
          [entityId]
        );
        if (!keepRows || keepRows.length === 0) continue;
        const keepId = keepRows[0].id;
        const [delRes] = await conn.query('DELETE FROM ha_entities WHERE entity_id = ? AND id <> ?', [entityId, keepId]);
        if (delRes && delRes.affectedRows) {
          console.log(`Entity ${entityId}: kept ${keepId}, deleted ${delRes.affectedRows}`);
        }
      }

      // re-check counts
      const [totalAfterRows] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities');
      const [distinctAfterRows] = await conn.query("SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IS NOT NULL");
      console.log('After dedupe, MariaDB ha_entities: total=', totalAfterRows[0].cnt, 'distinct=', distinctAfterRows[0].cnt);

    } else {
      console.log('No duplicates detected.');
    }

    // final compare: distinct vs mongoCount
    const [finalDistinctRows] = await conn.query("SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IS NOT NULL");
    const finalDistinct = finalDistinctRows[0].cnt;
    console.log('Final distinct_entity_id in MariaDB =', finalDistinct, 'Mongo documents =', mongoCount);

    if (finalDistinct !== mongoCount) {
      console.log('WARNING: counts differ between Mongo and MariaDB. Generating sample diff...');
      // list entity_ids present in Mongo but not in MariaDB
      const mongoIdsCursor = db.collection('ha_entities').find({}, { projection: { _id: 1 } });
      const mongoIds = [];
      while (await mongoIdsCursor.hasNext()) {
        const d = await mongoIdsCursor.next();
        mongoIds.push(d._id.toString());
        if (mongoIds.length >= 5000) break;
      }
      // check how many of these mongo ids exist in MariaDB as entity_id
      const placeholders = mongoIds.map(()=>'?').join(',');
      const [foundRows] = await conn.query(
        `SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IN (${placeholders})`,
        mongoIds
      );
      console.log(`Sample check: of first ${mongoIds.length} Mongo docs, ${foundRows[0].cnt} found in MariaDB entity_id column`);
    } else {
      console.log('Counts match between Mongo and MariaDB (distinct entity_id).');
    }

  } catch (err) {
    console.error('Error in ensure_ha_entities_sync:', err.stack || err.message || err);
    process.exitCode = 2;
  } finally {
    await conn.end();
    await mongoose.disconnect();
  }
})();

