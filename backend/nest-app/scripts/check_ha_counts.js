const mysql = require('mysql2/promise');
(async()=>{
  try{
    const cfg={host:process.env.MARIADB_HOST||'127.0.0.1',port:Number.parseInt(process.env.MARIADB_PORT||'3307',10),user:process.env.MARIADB_USER||'rb_user',password:process.env.MARIADB_PASSWORD||'rb_user_secret',database:process.env.MARIADB_DATABASE||'raueberbude'};
    const conn=await mysql.createConnection(cfg);
    const tables=['ha_areas','ha_automations','ha_devices','ha_entity_attributes','ha_entity_states','ha_entities','ha_media_players','ha_persons','ha_services','ha_snapshots','ha_zones'];
    for(const t of tables){
      try{
        const [r]=await conn.query(`SELECT COUNT(*) as c FROM \`${t}\``);
        console.log(`${t}: ${r[0].c}`);
      }catch(e){
        console.error(`${t}: ERROR: ${e.message}`);
      }
    }
    await conn.end();
  }catch(e){
    console.error('FATAL', e.message);
    process.exit(1);
  }
})();

