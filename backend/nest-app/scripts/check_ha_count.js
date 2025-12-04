const mysql = require('mysql2/promise');
(async ()=>{
  try{
    const cfg = { host:'127.0.0.1', port:3307, user:'rb_user', password:'rb_user_secret', database:'raueberbude' };
    const conn = await mysql.createConnection(cfg);
    const [r] = await conn.query('SELECT COUNT(*) as cnt FROM ha_entities');
    console.log('ha_entities count =', r[0].cnt);
    await conn.end();
  }catch(e){
    console.error('ERROR checking ha_entities:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();

