const net = require('node:net');
const PORT = process.env.TCP_PORT || 3003;
const HOST = process.env.TCP_HOST || '127.0.0.1';
const client = net.createConnection({ port: PORT, host: HOST }, () => {
  console.log('[test-client] connected to', HOST + ':' + PORT);
  const msg = { type: 'command', id: 'tc1', command: 'list_models', payload: {} };
  client.write(JSON.stringify(msg) + '\n');
});
client.setEncoding('utf8');
client.on('data', (data) => {
  const lines = data.split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      console.log('[adapter -> client]', JSON.stringify(JSON.parse(line), null, 2));
    } catch (e) {
      console.log('[adapter -> client] raw:', line);
    }
  }
});
client.on('error', (err) => { console.error('[test-client] error', err); process.exit(1); });
setTimeout(() => { console.log('[test-client] exiting'); client.end(); process.exit(0); }, 5000);

