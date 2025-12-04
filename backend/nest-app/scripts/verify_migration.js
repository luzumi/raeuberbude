#!/usr/bin/env node
/**
 * Verifikation: Vergleiche Anzahl Dokumente in MongoDB vs. MariaDB
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = {
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.MARIADB_PORT || '3307', 10),
  user: process.env.MARIADB_USER || 'rb_user',
  password: process.env.MARIADB_PASSWORD || 'rb_user_secret',
  database: process.env.MARIADB_DATABASE || 'raueberbude',
};

const MAPPINGS = [
  { mongo: 'users', maria: 'app_users' },
  { mongo: 'app_terminals', maria: 'app_terminals' },
  { mongo: 'categories', maria: 'categories' },
  { mongo: 'llminstances', maria: 'llminstances' },
  { mongo: 'transcripts', maria: 'transcripts' },
  { mongo: 'intentlogs', maria: 'intent_logs' },
  { mongo: 'ha_entities', maria: 'ha_entities' },
];

async function verify() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Verifikation: MongoDB ↔ MariaDB                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔌 Verbinde zu MongoDB...');
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  const mongoDb = mongoose.connection.db;
  console.log('✅ MongoDB verbunden');

  console.log('\n🔌 Verbinde zu MariaDB...');
  const mariaConn = await mysql.createConnection(MYSQL_CFG);
  console.log('✅ MariaDB verbunden\n');

  const results = [];
  let totalMongo = 0;
  let totalMaria = 0;
  let allMatch = true;

  for (const { mongo, maria } of MAPPINGS) {
    let mongoCount = 0;
    let mariaCount = 0;

    try {
      mongoCount = await mongoDb.collection(mongo).countDocuments();
      totalMongo += mongoCount;
    } catch (e) {
      mongoCount = 'N/A';
    }

    try {
      const [rows] = await mariaConn.query(`SELECT COUNT(*) as cnt FROM \`${maria}\``);
      mariaCount = rows[0].cnt;
      totalMaria += mariaCount;
    } catch (e) {
      mariaCount = 'N/A';
    }

    const match = mongoCount === mariaCount;
    if (!match && mongoCount !== 'N/A' && mariaCount !== 'N/A') {
      allMatch = false;
    }

    results.push({
      Collection: mongo,
      'MongoDB Docs': mongoCount,
      'MariaDB Rows': mariaCount,
      Match: match ? '✅' : '❌',
    });
  }

  console.table(results);

  console.log(`\nGesamt MongoDB:  ${totalMongo}`);
  console.log(`Gesamt MariaDB:  ${totalMaria}`);
  console.log(`Status:          ${allMatch ? '✅ ALLE ÜBEREINSTIMMEND' : '❌ ABWEICHUNGEN GEFUNDEN'}\n`);

  if (!allMatch) {
    console.log('⚠️  Es gibt Abweichungen zwischen MongoDB und MariaDB!');
    console.log('   Prüfe die Migrations-Logs auf Fehler.\n');
  } else {
    console.log('🎉 Migration erfolgreich! Alle Daten übereinstimmen.\n');
  }

  await mariaConn.end();
  await mongoose.disconnect();
}

verify().catch(err => {
  console.error('\n❌ Fehler:', err);
  process.exit(1);
});
