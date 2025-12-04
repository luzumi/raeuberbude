const mysql = require('mysql2/promise');
(async ()=>{
  const cfg={host:'127.0.0.1',port:3307,user:'rb_user',password:'rb_user_secret',database:'raueberbude'};
  const conn = await mysql.createConnection(cfg);
  const tables=['app_users','app_terminals','categories','llm_instances','llminstances','llminstances','intent_logs','intentlogs','transcripts'];
  for(const t of tables){
    try{
      const [rows]=await conn.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[cfg.database,t]);
      console.log('\n--- ' + t + ' ---');
      if(rows.length===0){ console.log('(not found)'); continue; }
      rows.forEach(r=>console.log(`${r.COLUMN_NAME}\t${r.COLUMN_TYPE}\t${r.IS_NULLABLE}\t${r.COLUMN_DEFAULT===null?'<NULL>':r.COLUMN_DEFAULT}`));
    }catch(e){
      console.log('\n--- ' + t + ' ---');
      console.log('ERR', e.message);
    }
  }
  await conn.end();
})();

