# Web MCP Server – Chrome DevTools (Puppeteer)

Pfad: `/.specify/mcp-servers/web-mcp-server.js`

- Zweck: Zugriff auf das reale Frontend über Chrome DevTools (Puppeteer)
- Features: Sessions, Navigate, Click/Type/Key, Evaluate, HTML-Content, Screenshot, Console-/Network-Logs, Hover, Scroll, Viewport
- Port: Standard `4200` (ENV `MCP_PORT`)
- Headless: `MCP_HEADLESS` (`true` | `false` | `new`, Default: `new`)

## Starten

Windows, sichtbar (headed):
```powershell
npm run mcp:web:headed:win
```

Windows, headless (Default):
```powershell
npm run mcp:web:local
```

Abweichender Port (z. B. wenn Angular 4200 nutzt):
```powershell
$env:MCP_PORT='4210'; npm run mcp:web:local
```

## Sicherheit & Konfiguration

- `MCP_TOKEN`: Optionaler Token; wenn gesetzt, sind alle Endpunkte außer `/health`, `/tools` geschützt.
  - Auth-Header: `Authorization: Bearer <TOKEN>` oder `x-mcp-token: <TOKEN>`
- `MCP_ALLOWED_HOSTS`: Kommagetrennte Liste erlaubter Hosts/Domains für Navigation (z. B. `localhost,127.0.0.1,*.example.com`). `*` erlaubt alles. Wenn leer, ist alles erlaubt.
- `MCP_ALLOWED_ORIGINS`: CORS-Allowlist für Browser-/Agent-Requests (z. B. `http://localhost:4300`). `*` erlaubt alles. Wenn leer, ist alles erlaubt.
- `MCP_SESSION_TTL_MS`: Inaktivitäts-Timeout je Session (Default 600000 ms = 10 min) – automatische Aufräumung.
- `MCP_MAX_SESSIONS`: Maximale parallele Sessions (Default 5).

Beispieldatei: `/.env.mcp.example` (bei Bedarf nach `.env` kopieren).

## Endpunkte

- GET `/health` – Status, offene Sessions, Headless-Modus
- GET `/tools` – Tool-Discovery (Operationen + Schemas)

Sessions:
- GET `/sessions` – Sessions auflisten
- POST `/sessions` – neue Session `{ url?, headless?, viewport?, userAgent?, label? }`
- POST `/sessions/closeAll` – alle Sessions beenden
- DELETE `/sessions/:id` – Session löschen
- POST `/sessions/:id/close` – Session beenden

Navigation & Interaktion:
- POST `/sessions/:id/navigate` – `{ url, waitUntil?, timeout? }` (Host-Allowlist greift)
- POST `/sessions/:id/waitForSelector` – `{ selector, timeout? }`
- POST `/sessions/:id/click` – `{ selector, button?, clickCount? }`
- POST `/sessions/:id/type` – `{ selector, text, delay? }`
- POST `/sessions/:id/pressKey` – `{ key, selector? }`
- POST `/sessions/:id/hover` – `{ selector }`
- POST `/sessions/:id/scrollTo` – `{ x?, y?, selector? }`
- POST `/sessions/:id/viewport` – `{ width, height, deviceScaleFactor?, isMobile? }`

Inspektion & Artefakte:
- POST `/sessions/:id/evaluate` – `{ expression, arg? }` (JS im Page-Context)
- GET `/sessions/:id/content` – HTML der Seite
- POST `/sessions/:id/screenshot` – `{ fullPage?, path? }` – Base64 + optional lokaler Pfad
- GET `/sessions/:id/logs/console` – Console-Logs
- GET `/sessions/:id/logs/network` – Netzwerk-Logs

## Beispiele (PowerShell)

Session anlegen und zur App navigieren:
```powershell
$base = 'http://localhost:4200'
$token = $env:MCP_TOKEN  # optional
$headers = @{ 'Content-Type' = 'application/json' }
if ($token) { $headers['Authorization'] = "Bearer $token" }

$s = Invoke-RestMethod -Method Post -Uri "$base/sessions" -Headers $headers -Body (@{ url='http://localhost:4300' } | ConvertTo-Json)
$sid = $s.sessionId

Invoke-RestMethod -Method Post -Uri "$base/sessions/$sid/waitForSelector" -Headers $headers -Body (@{ selector='app-root'; timeout=15000 } | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri "$base/sessions/$sid/screenshot" -Headers $headers -Body (@{ path='./public/assets/screenshots/app-home.png' } | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri "$base/sessions/$sid/close" -Headers $headers
```

## Hinweise

- Bei aktiviertem `MCP_TOKEN` immer den Header mitsenden.
- Nutze `MCP_ALLOWED_HOSTS`, um Navigation auf definierte Hosts zu beschränken (Sicherheitsgewinn).
- TTL/Max-Sessions verhindern Zombie-Sessions und Ressourcen-Leaks.
