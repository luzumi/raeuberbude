#!/usr/bin/env node

/**
 * Server Health Check Script
 * Prüft, ob alle benötigten Server laufen
 */

const http = require('http');

const servers = [
  { name: 'Backend Express', host: 'localhost', port: 3000, path: '/api/transcripts' },
  { name: 'NestJS', host: 'localhost', port: 3001, path: '/api/speech' },
  { name: 'MongoDB', host: 'localhost', port: 27017, path: '/' },
];

function checkServer(server) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: server.host,
        port: server.port,
        path: server.path,
        timeout: 2000,
      },
      (res) => {
        resolve({
          ...server,
          status: 'OK',
          statusCode: res.statusCode,
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        ...server,
        status: 'ERROR',
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...server,
        status: 'TIMEOUT',
      });
    });
  });
}

async function main() {
  console.log('\n🔍 Server Health Check\n');
  console.log('═'.repeat(60));

  const results = await Promise.all(servers.map(checkServer));

  let allOk = true;
  results.forEach((result) => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(20)} http://${result.host}:${result.port}`);

    if (result.status === 'OK') {
      console.log(`   Status: ${result.statusCode}`);
    } else {
      console.log(`   Status: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      allOk = false;
    }
    console.log('');
  });

  console.log('═'.repeat(60));

  if (allOk) {
    console.log('✅ Alle Server laufen!\n');
    console.log('Starte jetzt das Frontend mit: npm start');
  } else {
    console.log('❌ Einige Server sind nicht erreichbar!\n');
    console.log('Starte fehlende Server mit: npm run start:dev');
  }
  console.log('');
}

main();

