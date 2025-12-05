/* Compact fixed node load test
   Writes artifacts into %USERPROFILE%\raeuberbude_artifacts to avoid editor-related overwrite
*/
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.USERPROFILE || os.homedir();
const ARTIFACTS = path.join(HOME, 'raeuberbude_artifacts');
try { fs.mkdirSync(ARTIFACTS, { recursive: true }); } catch (e) {}

function writeArtifact(name, content){
  try { fs.writeFileSync(path.join(ARTIFACTS, name), content); console.log('WROTE', name); } catch(e){ console.error('WRITE_ERR', name, e && e.message); }
}

// sentinel
writeArtifact('node-load-started-fixed.txt', new Date().toISOString());

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/,'');
const TOTAL = Number.parseInt(process.env.TOTAL || '20',10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY || '5',10);
const API_KEY = process.env.API_KEY || 'test-api-key';

console.log('BEGIN fixed load test', { BASE_URL, TOTAL, CONCURRENCY });

let payload = { userId:'node-load-user', terminalId:'node-load-term', transcript:'load test' };
try {
  const p = path.resolve(__dirname,'debug_payload.json');
  if (fs.existsSync(p)) payload = JSON.parse(fs.readFileSync(p,'utf8'));
} catch(e){ }

async function sendOne(i){
  const start = Date.now();
  try{
    const res = await fetch(BASE_URL + '/api/transcripts', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    let data = txt; try { data = JSON.parse(txt); } catch(e){}
    return { status: res.status, data, dur: Date.now()-start };
  } catch(e){
    return { error: String(e), dur: Date.now()-start };
  }
}

(async ()=>{
  try{
    const results = [];
    for (let offset=0; offset<TOTAL; offset+=CONCURRENCY){
      const batch = Math.min(CONCURRENCY, TOTAL-offset);
      const promises = [];
      for (let j=0;j<batch;j++) promises.push(sendOne(offset+j+1));
      const res = await Promise.all(promises);
      results.push(...res);
      console.log('progress', Math.min(offset+batch,TOTAL));
    }
    const success = results.filter(r=>r && r.status && r.status>=200 && r.status<400).length;
    const failure = results.length - success;
    const durations = results.map(r=>r && r.dur? r.dur:0).filter(n=>typeof n==='number').sort((a,b)=>a-b);
    const p95 = durations.length ? durations[Math.floor(durations.length*0.95)] : 0;
    const summary = { total: TOTAL, sent: results.length, success, failure, p95Ms: p95, sample: results.slice(0,10) };
    writeArtifact('node-load-results-fixed.json', JSON.stringify(summary,null,2));
    writeArtifact('node-load-run-log-fixed.txt', JSON.stringify(summary));
    console.log('DONE', summary);
  } catch(e){
    writeArtifact('node-load-error-fixed.txt', String(e && e.stack? e.stack: e));
    console.error('FATAL', e && e.message);
    process.exit(2);
  }
})();

