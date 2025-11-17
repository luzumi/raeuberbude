const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
// Remove BOM if present (UTF-8 BOM = \uFEFF)
if (packageJsonContent.codePointAt(0) === 0xFEFF) {
  packageJsonContent = packageJsonContent.slice(1);
}
const packageJson = JSON.parse(packageJsonContent);

// Füge Scripts hinzu
// Use concurrently + npx to start frontend, backend and mcpserver
packageJson.scripts['start:network'] = 'npx concurrently "npx ng serve --host 0.0.0.0 --port 4301" "npm --prefix backend/nest-app run start:dev" "npm --prefix .specify/mcp-servers run all"';
packageJson.scripts['serve:cert'] = 'node scripts/serve-cert.js';

// Schreibe zurück
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log('✅ Scripts hinzugefügt/aktualisiert:');
console.log('  - start:network (Frontend + Backend + MCP-Server)');
console.log('  - serve:cert');
