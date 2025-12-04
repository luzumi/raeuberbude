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
    // create temporary table with unique rows (keep latest updated_at)
    console.log('Starting SQL dedupe (may take time)...');
    await conn.query('CREATE TABLE IF NOT EXISTS ha_entities_dedupe LIKE ha_entities');
    await conn.query('TRUNCATE TABLE ha_entities_dedupe');

    // insert latest rows per entity_id
    await conn.query(`
      INSERT INTO ha_entities_dedupe
      SELECT * FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY COALESCE(updated_at, created_at, '1970-01-01') DESC, id DESC) rn
        FROM ha_entities
        WHERE entity_id IS NOT NULL
      ) t WHERE t.rn = 1
    `);

    // count results
    const [res] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities_dedupe');
    const kept = res[0].cnt;
    console.log('Unique rows kept in temp table =', kept);

    // delete original rows for entity_id present in dedupe table and insert deduped rows
    // backup original rows
    await conn.query('CREATE TABLE IF NOT EXISTS ha_entities_backup LIKE ha_entities');
    await conn.query('TRUNCATE TABLE ha_entities_backup');
    await conn.query('INSERT INTO ha_entities_backup SELECT * FROM ha_entities');

    // remove duplicates and replace with deduped rows
    await conn.query('DELETE FROM ha_entities WHERE entity_id IS NOT NULL');
    await conn.query('INSERT INTO ha_entities SELECT * FROM ha_entities_dedupe');

    console.log('Replaced duplicate rows with deduped rows.');
  } catch (e) {
    console.error('SQL dedupe error:', e.message || e);
    process.exitCode = 2;
  } finally {
    await conn.end();
  }
})();

