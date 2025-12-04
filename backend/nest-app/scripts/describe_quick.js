(async ()=>{
  try{
    const mysql = require('mysql2/promise');
    const cfg={host:'127.0.0.1',port:3307,user:'rb_user',password:'rb_user_secret',database:'raueberbude'};
    const c = await mysql.createConnection(cfg);
    const [r1] = await c.query('SELECT COUNT(*) as cnt FROM transcripts');
    console.log('transcripts count=', r1[0].cnt);
    const [cols] = await c.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', ['raueberbude','app_users']);
    console.log('app_users cols=', cols.map(x=>x.COLUMN_NAME).join(','));
    await c.end();
  } catch(e){
    console.error('ERR', e.message);
    process.exit(2);
  }
})();

