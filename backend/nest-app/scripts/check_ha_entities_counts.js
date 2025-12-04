const mysql = require('mysql2/promise');

const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function(){
  const conn = await mysql.createConnection(MYSQL_CFG);
  try {
    const [totalRows] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities');
    const [distinctRows] = await conn.query('SELECT COUNT(DISTINCT entity_id) as cnt FROM ha_entities WHERE entity_id IS NOT NULL');
    const total = totalRows[0].cnt;
    const distinct = distinctRows[0].cnt;
    console.log(`ha_entities: total_rows=${total}, distinct_entity_id=${distinct}`);

    // list any entity_ids that still have duplicates (limit 20)
    const [dups] = await conn.query(`SELECT entity_id, COUNT(*) as cnt FROM ha_entities WHERE entity_id IS NOT NULL GROUP BY entity_id HAVING cnt > 1 LIMIT 20`);
    if (dups.length === 0) {
      console.log('No duplicate entity_id rows found (checked sample).');
    } else {
      console.log('Found some duplicate entity_id rows (sample):');
      console.table(dups);
    }
  } catch (err) {
    console.error('Error checking ha_entities counts:', err.message || err);
    process.exitCode = 2;
  } finally {
    await conn.end();
  }
})();

