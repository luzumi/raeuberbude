const mysql = require('mysql2/promise');

const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

(async function main() {
  console.log('Connecting to MariaDB', MYSQL_CFG.host + ':' + MYSQL_CFG.port);
  const conn = await mysql.createConnection(MYSQL_CFG);

  try {
    // Find entity_ids with more than one row
    const [dups] = await conn.query(`
      SELECT entity_id, COUNT(*) as cnt
      FROM ha_entities
      WHERE entity_id IS NOT NULL
      GROUP BY entity_id
      HAVING cnt > 1
    `);

    console.log('Found', dups.length, 'entity_id(s) with duplicates');

    for (const row of dups) {
      const entityId = row.entity_id;

      // find the id to keep: newest updated_at (fallback to created_at), tie-breaker highest id
      const [keepRows] = await conn.query(`
        SELECT id
        FROM ha_entities
        WHERE entity_id = ?
        ORDER BY COALESCE(updated_at, created_at, '1970-01-01') DESC, id DESC
        LIMIT 1
      `, [entityId]);

      if (!keepRows || keepRows.length === 0) {
        console.warn('No rows to keep for entity_id', entityId);
        continue;
      }

      const keepId = keepRows[0].id;

      const [delRes] = await conn.query(`
        DELETE FROM ha_entities
        WHERE entity_id = ? AND id <> ?
      `, [entityId, keepId]);

      console.log(`Entity '${entityId}': kept id=${keepId}, deleted ${delRes.affectedRows} rows`);
    }

    console.log('Deduplication complete.');
  } catch (err) {
    console.error('Error during dedupe:', err.message || err);
    process.exitCode = 2;
  } finally {
    await conn.end();
  }
})();

