#!/usr/bin/env node
/* Schritt 1: Leere alle Tabellen in MariaDB (außer ha_entities und migrations) */

const mysql = require('mysql2/promise');

const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

async function truncateTables() {
  console.log('=============================================================');
  console.log('    Schritt 1: Tabellen leeren');
  console.log('=============================================================\n');

  let conn;
  try {
    console.log('Verbinde zu MariaDB...');
    conn = await mysql.createConnection(MYSQL_CFG);
    console.log('MariaDB verbunden: ' + MYSQL_CFG.host + ':' + MYSQL_CFG.port + '\n');

    const tablesToTruncate = [
      'app_users',
      'app_terminals',
      'categories',
      'llm_instances',
      'transcripts',
      'intent_logs',
    ];

    console.log('Leere folgende Tabellen:');
    tablesToTruncate.forEach(function(t) { console.log('  - ' + t); });
    console.log('');

    // FK-Checks deaktivieren
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToTruncate) {
      try {
        await conn.query('TRUNCATE TABLE `' + table + '`');
        console.log('  OK: ' + table + ' geleert');
      } catch (e) {
        console.error('  ERROR beim Leeren von ' + table + ': ' + (e && e.message ? e.message : e));
      }
    }

    // FK-Checks wieder aktivieren
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\nAlle Tabellen-Prozesse abgeschlossen');
    console.log('\nNächste Schritte:');
    console.log('  1) Starte die NestJS-App neu in einem separaten Terminal: npm run start:dev');
    console.log('  2) Warte auf HA-Sync (Logs: [HaBootstrapService] / [HaSyncService])');
    console.log('  3) Dann: node scripts/step2_migrate_collections.js\n');

    await conn.end();
    return 0;
  } catch (err) {
    console.error('\nFATALER Fehler: ' + (err && err.message ? err.message : err));
    if (conn) try { await conn.end(); } catch (_) {}
    return 2;
  }
}

// Run
truncateTables().then(function(code) { process.exit(code); }).catch(function(err) {
  console.error('Unexpected error: ', err);
  process.exit(3);
});
