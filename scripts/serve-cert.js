#!/usr/bin/env node

/**
 * Helper script zum Starten eines temporären Webservers
 * für die Zertifikat-Verteilung an mobile Geräte
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8000;
const SSL_DIR = path.join(__dirname, '..', 'ssl');
const CERT_FILE = path.join(SSL_DIR, 'localhost.crt');

// Ermittle lokale IP-Adresse
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Einfacher HTTP Server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  if (req.url === '/' || req.url === '/index.html') {
    // HTML Seite mit Download-Link
    const localIP = getLocalIP();
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Räuberbude - Zertifikat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .download-btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 50px;
      font-size: 1.2em;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      transition: all 0.3s;
    }
    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
    }
    .info {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin-top: 30px;
      text-align: left;
    }
    .info h3 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.2em;
    }
    .steps {
      list-style: none;
      counter-reset: step;
    }
    .steps li {
      counter-increment: step;
      margin-bottom: 15px;
      padding-left: 40px;
      position: relative;
      color: #555;
      line-height: 1.6;
    }
    .steps li:before {
      content: counter(step);
      position: absolute;
      left: 0;
      top: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9em;
    }
    .app-link {
      margin-top: 20px;
      padding: 15px;
      background: #e3f2fd;
      border-radius: 10px;
      color: #1976d2;
      font-weight: 600;
      word-break: break-all;
    }
    .note {
      margin-top: 20px;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 5px;
      color: #856404;
      text-align: left;
    }
    @media (max-width: 600px) {
      .container { padding: 30px 20px; }
      h1 { font-size: 1.5em; }
      .download-btn { font-size: 1em; padding: 12px 30px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Räuberbude</h1>
    <p class="subtitle">SSL-Zertifikat für lokales Netzwerk</p>

    <a href="/localhost.crt" class="download-btn" download>
      📥 Zertifikat herunterladen
    </a>

    <div class="info">
      <h3>Installation:</h3>
      <ul class="steps">
        <li>Zertifikat herunterladen (Button oben)</li>
        <li>Datei öffnen (Downloads oder Benachrichtigung)</li>
        <li>Name eingeben: "Raueberbude"</li>
        <li>Installieren bestätigen</li>
        <li><strong>iOS:</strong> Einstellungen → Info → Zertifikatsvertrauensstellungen aktivieren!</li>
      </ul>
    </div>

    <div class="app-link">
      📱 App öffnen nach Installation:<br>
      <strong>https://${localIP}:4200</strong>
    </div>

    <div class="note">
      ℹ️ <strong>Wichtig:</strong> Zertifikat muss auf jedem Gerät installiert werden, das die App nutzen soll.
    </div>
  </div>
</body>
</html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
  else if (req.url === '/localhost.crt') {
    // Zertifikat ausliefern
    try {
      const cert = fs.readFileSync(CERT_FILE);
      res.writeHead(200, {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="localhost.crt"'
      });
      res.end(cert);
      console.log('✅ Zertifikat wurde heruntergeladen!');
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Zertifikat nicht gefunden');
      console.error('❌ Zertifikat-Datei nicht gefunden:', err.message);
    }
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Nicht gefunden');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n🔒 Zertifikat-Server gestartet!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 Auf Handy/Tablet öffnen:`);
  console.log(`   http://${localIP}:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Tipps:');
  console.log('   • QR-Code Generator nutzen für einfachen Zugriff');
  console.log('   • Strg+C zum Beenden\n');
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Server beendet.\n');
  process.exit(0);
});

