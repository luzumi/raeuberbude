const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
const MYSQL_CFG = { host:'127.0.0.1', port:3307, user:'rb_user', password:'rb_user_secret', database:'raueberbude' };

function formatDatetime(val){ if(!val) return null; if(val instanceof Date) return val.toISOString().replace('T',' ').replace('Z',''); if(typeof val==='string') return val.replace('T',' ').replace('Z',''); return val; }

async function getTableColumns(conn, tableName){ const [rows]=await conn.query('SELECT COLUMN_NAME,COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',[MYSQL_CFG.database, tableName]); return rows.map(r=>({name:r.COLUMN_NAME,type:r.COLUMN_TYPE})); }

function transformLlmInstance(doc){ return { id: uuidv4(), mongo_id: doc._id?doc._id.toString():null, data: JSON.stringify(doc), created_at: doc.createdAt||doc.created_at||new Date(), updated_at: doc.updatedAt||doc.updated_at||new Date() }; }
function transformIntentLog(doc){ return { id: uuidv4(), timestamp: doc.timestamp|| (doc.createdAt?doc.createdAt.toISOString():new Date().toISOString()), transcript: doc.transcript||'', intent: doc.intent||'', summary: doc.summary||null, keywords: doc.keywords?JSON.stringify(doc.keywords):null, confidence: doc.confidence||null, terminal_id: doc.terminalId||doc.terminal_id||null, created_at: doc.createdAt||doc.created_at||new Date() }; }

(async ()=>{
  await mongoose.connect(MONGO_URI,{autoIndex:false});
  const db = mongoose.connection.db;
  const conn = await mysql.createConnection(MYSQL_CFG);

  for (const {coll, table, transformer} of [
    {coll: 'llminstances', table: 'llminstances', transformer: transformLlmInstance},
    {coll: 'intentlogs', table: 'intent_logs', transformer: transformIntentLog},
  ]){
    // Stub: archived debug script
    console.log('dbg_migration_preview.js archived. See scripts/archive/original-scripts.json');
  }

  await conn.end();
  await mongoose.disconnect();
})();
