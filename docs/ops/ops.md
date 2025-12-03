# 🚀 Quick Start: Home Assistant Daten importieren

## Situation
- `ha_areas` Collection ist leer
- 343 Entities in `ha_entities` werden nicht korrekt angezeigt
- Import-Datei existiert: `ha_structure_2025-10-30T11-32-32.058Z.json`

## Lösung in 3 Schritten

### 1️⃣ Server starten
```powershell
cd C:\Users\corat\IdeaProjects\raueberbude
npm run start
```

Warte bis beide Server laufen:
- ✅ Frontend: `http://localhost:4200`
- ✅ Backend: `http://localhost:3001`

---

### 2️⃣ Areas Admin öffnen

Navigiere im Browser zu:
```
http://localhost:4200/admin/areas
```

Du solltest sehen:
- ⚠️ **Leere Tabelle**
- ⚠️ **Warning: "Keine Areas gefunden"**
- 🟠 **Button: "HA Daten neu importieren"**

---

### 3️⃣ Daten importieren

1. Klick auf den orangenen Button **"HA Daten neu importieren"**
2. **Confirmation Dialog** erscheint:
   ```
   Dies importiert die Home Assistant Struktur neu...
   Bereiche, Geräte, Entitäten und Services werden aktualisiert.
   
   Fortfahren?
   ```
3. Klick **OK**
4. Button zeigt: **"Importiere..."** (disabled)
5. Nach 2-5 Sekunden: **✅ Success-Snackbar**
   ```
   ✅ Import erfolgreich! 
   12 Areas, 343 Entities importiert.
   ```
6. **Tabelle aktualisiert sich automatisch** mit Areas

---

## ✅ Überprüfung

### Check 1: Areas anzeigen
```
http://localhost:4200/admin/areas
```
Sollte jetzt Areas in der Tabelle zeigen (z.B. Wohnzimmer, Küche, etc.)

### Check 2: Transcript Dialog
```
http://localhost:4200/admin/speech-assistant?tab=2
```
1. Klick auf **Auge-Icon** bei einem Transkript
2. Dialog öffnet sich
3. **Area Dropdown** sollte Areas enthalten
4. **Entity-Liste** sollte 50 Entities zeigen

### Check 3: MongoDB (Optional)
```javascript
// MongoDB Shell oder Compass
db.ha_areas.countDocuments()      // > 0
db.ha_entities.countDocuments()   // = 343
```

---

## 🔧 Alternative: API direkt aufrufen

Falls die UI nicht funktioniert, kannst du den Import direkt per API triggern:

### PowerShell:
```powershell
$body = @{} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/homeassistant/import/reimport" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Browser DevTools Console:
```javascript
fetch('/api/homeassistant/import/reimport', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: '{}'
})
.then(r => r.json())
.then(data => {
  console.log('✅ Import erfolgreich!');
  console.log('Areas:', data.stats?.areas);
  console.log('Entities:', data.stats?.entities);
});
```

---

## 📊 Erwartetes Ergebnis

Nach erfolgreichem Import solltest du haben:

| Collection | Anzahl | Status |
|------------|--------|--------|
| `ha_areas` | ~10-15 | ✅ Gefüllt |
| `ha_devices` | ~40-50 | ✅ Gefüllt |
| `ha_entities` | 343 | ✅ Gefüllt |
| `ha_services` | ~80-100 | ✅ Gefüllt |
| `hasnapshots` | 1+ | ✅ Snapshot erstellt |

---

## 🐛 Troubleshooting

### Problem: Button fehlt
**Lösung:** Seite neu laden (F5)

### Problem: "No import file found"
**Prüfen:**
```powershell
ls C:\Users\corat\IdeaProjects\raueberbude\ha_structure*.json
```
Sollte zeigen:
```
ha_structure_2025-10-30T11-32-32.058Z.json
```

### Problem: Import dauert lange
**Normal:** Bis zu 10 Sekunden bei 343 Entities
**Zu lang (>30s):** MongoDB-Connection prüfen

### Problem: Fehler "Import failed"
**Check Backend-Logs:**
```powershell
cat C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app\logs\error.log | Select-Object -Last 20
```

### Problem: Areas/Entities noch leer nach Import
**Snapshot-Status prüfen:**
```
GET http://localhost:3001/api/homeassistant/import/snapshots
```
Status sollte `"completed"` sein, nicht `"failed"`

---

## 🎯 Success Criteria

Du weißt, dass es funktioniert hat, wenn:

✅ Areas Admin zeigt mindestens 5 Areas  
✅ Transcript Dialog zeigt 50 Entities  
✅ Area Dropdown ist nicht leer  
✅ Entity-Suche findet Ergebnisse  
✅ Keine Warning-Boxen mehr im Dialog  

---

## 📝 Nächste Schritte nach Import

1. **Transcript bearbeiten:**
   - Area zuordnen (z.B. "Wohnzimmer")
   - Entity auswählen (z.B. "Wohnzimmer Deckenlampe")
   - Aktion wählen (z.B. "Helligkeit einstellen")
   - Parameter setzen (z.B. 75%)
   - Speichern

2. **Automatische Ausführung (geplant):**
   - Intent-System verknüpfen
   - Voice Commands automatisch ausführen
   - Konditions-System aufbauen

---

## ⏱️ Zeitaufwand

- Server starten: **30 Sekunden**
- Import durchführen: **5 Sekunden**
- Verifizieren: **30 Sekunden**
- **Total: ~1 Minute** ✨

---

🎉 **Fertig! Jetzt kannst du Areas und Entities in den Transkripten zuordnen!**

# Proxy & CORS Konfiguration

## Problem
Bei der Spracheingabe traten CORS-Fehler auf, weil Requests an verschiedene Hosts gingen:
- `http://localhost:4301` (Angular Dev Server)
- `http://192.168.178.25:4301` (Backend Express)
- `http://localhost:3001` (NestJS)

## Lösung

### 1. Angular Proxy (`proxy.conf.cjs`)
Der Proxy leitet alle `/api/*` Requests an die richtigen Backend-Server weiter:

| Route | Target | Beschreibung |
|-------|--------|--------------|
| `/api/speech` | NestJS (localhost:3001) | Spracheingabe, STT, TTS |
| `/api/homeassistant` | NestJS (localhost:3001) | Home Assistant Queries |
| `/api/transcripts` | Backend Express (localhost:3000) | Transkripte |
| `/api/intent-logs` | Backend Express (localhost:3000) | Intent-Logs |
| `/users` | NestJS (localhost:3001) | User CRUD |
| `/api` | Home Assistant (homeassistant.local:8123) | HA API (catch-all) |

**Wichtig**: Spezifische Routes müssen VOR dem catch-all `/api` stehen!

### 2. Backend CORS (Express)
```javascript
// backend/server.js
import cors from 'cors';

app.use(cors({
  origin: true, // Erlaubt alle Origins in Entwicklung
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Handle preflight globally
app.options('*', cors());
```

### 3. NestJS CORS
```typescript
// backend/nest-app/src/main.ts
if (isProd) {
  // Production: nur konfigurierte Origins
  app.enableCors({ origin: origins, credentials: true });
} else {
  // Development: alle Origins erlaubt
  app.enableCors({ origin: true, credentials: true });
}
```

## Server starten

### Lokale Entwicklung
```bash
npm run start:dev
```
Startet:
- Angular Dev Server (localhost:4200) mit Proxy
- Backend Express (192.168.178.25:4301)
- NestJS (localhost:3001)

### Netzwerk-Entwicklung
```bash
npm run start:network
```
Startet zusätzlich:
- Angular auf 0.0.0.0:4200 (für mobile Geräte)
- MCP-Server

## Umgebungsvariablen (optional)

### Proxy-Targets überschreiben
```bash
# NestJS
NEST_HOST=192.168.1.100 NEST_PORT=3001 npm start

# Backend Express
BACKEND_HOST=192.168.1.100 BACKEND_PORT=3000 npm start

# Home Assistant
HA_BASE_URL=http://192.168.1.50:8123 npm start
```

## Troubleshooting

### CORS Error trotz Proxy?
- Prüfe, ob der Request wirklich durch den Proxy geht (sollte an `localhost:4200/api/...`)
- Prüfe Browser Network Tab: Host sollte `localhost:4200` sein
- Prüfe Backend-Logs auf Preflight-Requests (OPTIONS)

### 404 für `/api/...`?
- Prüfe, ob Backend-Server läuft
- Prüfe Proxy-Logs im Terminal
- Prüfe, ob die Route im Backend existiert

### 400 Bad Request?
- Prüfe Request-Body (muss JSON sein)
- Prüfe Header `Content-Type: application/json`
- Prüfe Backend-Validierung (NestJS: ValidationPipe)

### Preflight (OPTIONS) fehlschlägt?
- Backend muss `OPTIONS *` mit 200 beantworten
- CORS-Header müssen gesetzt sein
- Prüfe `Access-Control-Allow-Methods` und `Access-Control-Allow-Headers`

## Best Practices

1. **Entwicklung**: Nutze den Angular-Proxy (kein CORS-Problem)
2. **Produktion**: Nutze reverse Proxy (nginx/traefik) statt CORS
3. **Relative URLs**: Nutze `/api/...` statt absolute URLs wie `http://192.168.x.x:port/api/...`
4. **Environment Files**: Konfiguriere API-Base-URL zentral (leerer String = relativ)
5. **Logging**: `logLevel: 'debug'` im Proxy für Fehlersuche
6. **Port-Konsistenz**: Angular Dev Server = 4200, Backend = 3000, NestJS = 3001

## Wichtige Änderungen

### Services nutzen relative URLs
Alle Services wurden angepasst, um relative URLs zu verwenden:
- `transcription-validator.service.ts`: `backendApiUrl = ''`
- `admin-speech-assistant.component.ts`: `backendUrl = ''`
- Environment files: `backendApiUrl = ''`

Dadurch gehen alle Requests durch den Angular-Proxy und CORS-Probleme werden vermieden.

# 🔧 HOME ASSISTANT PROXY FIX

## ❌ Das Problem:

```
Error: getaddrinfo ENOTFOUND homeassistant.local
```

**Ursache:**
- `homeassistant.local` (mDNS) wird nicht aufgelöst
- Windows/Router unterstützt mDNS nicht immer zuverlässig
- Proxy kann Home Assistant nicht erreichen

## ✅ Die Lösung:

### Schritt 1: Finde deine Home Assistant IP

**Option 1: In der Fritz!Box Router-Oberfläche**
```
http://fritz.box
→ Heimnetz
→ Netzwerk
→ Suche nach "homeassistant"
```

**Option 2: Nmap Scan (wenn installiert)**
```bash
nmap -p 8123 192.168.178.0/24
```

**Option 3: Home Assistant direkt im Browser öffnen**
Wenn es läuft, sollte eine dieser funktionieren:
- http://192.168.178.50:8123
- http://192.168.178.40:8123
- http://192.168.178.100:8123

### Schritt 2: Setze die richtige IP in proxy.conf.json

**Ich habe bereits gesetzt:**
```json
{
  "/api": {
    "target": "http://192.168.178.50:8123",
    ...
  }
}
```

**Falls deine Home Assistant IP anders ist**, ändere `192.168.178.50` auf die richtige IP!

### Schritt 3: Services neu starten

Die Services werden gerade neu gestartet...

Wenn die IP falsch ist:
```bash
# 1. Stoppe Services
taskkill /F /IM node.exe

# 2. Ändere proxy.conf.json mit richtiger IP

# 3. Starte neu
npm run start:network
```

## 🎯 Teste Home Assistant Verbindung:

### Im Browser:
```
http://localhost:4301/api/states
```

Sollte jetzt Home Assistant States zurückgeben statt `ENOTFOUND` Error!

## 📱 App auf IP erreichbar:

Frontend läuft auf `0.0.0.0:4301` - ist auf ALLEN IPs erreichbar!

**Teste auf Handy:**
```
http://10.210.173.36:4301
http://192.168.56.1:4301
http://172.25.160.1:4301
```

**Oder finde deine WLAN-IP:**
```cmd
ipconfig | findstr "WLAN" -A 4
```

Dann:
```
http://DEINE-WLAN-IP:4301
```

## ⚠️ Häufige Home Assistant IPs:

- `192.168.178.50` (Standard bei vielen Setups)
- `192.168.178.100`
- `192.168.1.50`
- `192.168.0.50`

**Probiere diese im Browser:**
```
http://192.168.178.50:8123
```

Welche funktioniert, trage in `proxy.conf.json` ein!

---

**WICHTIG**: Ohne die richtige Home Assistant IP werden `/api/states` und WebSocket-Verbindungen weiterhin fehlschlagen!

# HTTPS Setup für lokales Netzwerk

## Problem

Browser blockieren Mikrofon-Zugriff über HTTP aus Sicherheitsgründen:
```
Error: Unsicherer Kontext. Bitte die App über HTTPS oder localhost laden.
```

## Lösung

HTTPS mit selbstsigniertem Zertifikat für das lokale Netzwerk.

## Setup (bereits erledigt)

### 1. Zertifikat erstellt ✅
```
ssl/
  localhost.crt  - Zertifikat (öffentlich)
  localhost.key  - Private Key
  localhost.pfx  - Windows Format
```

**Gültig für:**
- `localhost`
- `raueberbude.local`
- `192.168.56.1`
- `*.local`

**Gültigkeit:** 10 Jahre

### 2. Angular konfiguriert ✅
```json
"serve": {
  "options": {
    "ssl": true,
    "sslCert": "ssl/localhost.crt",
    "sslKey": "ssl/localhost.key",
    "host": "0.0.0.0",
    "port": 4200
  }
}
```

## Nutzung

### Server starten

**Standard (jetzt mit HTTPS):**
```bash
npm start
# oder
ng serve
```

**Explizit HTTPS:**
```bash
npm run start:https
```

**Server läuft dann auf:**
```
https://localhost:4200
https://192.168.56.1:4200  (PC im Netzwerk)
```

## Zertifikat auf Geräten installieren

Da das Zertifikat selbstsigniert ist, müssen Geräte es als vertrauenswürdig markieren.

### Android (Handy/Tablet)

#### Methode 1: QR-Code (empfohlen)
1. **Zertifikat konvertieren** (einmalig):
   ```bash
   cd C:\Users\corat\IdeaProjects\raueberbude\ssl
   certutil -encode localhost.crt localhost_base64.crt
   ```

2. **QR-Code generieren**:
   - Webseite: https://www.qr-code-generator.com/
   - Content Type: "Text"
   - Inhalt: Kompletter Inhalt von `localhost_base64.crt`
   - QR-Code generieren

3. **Auf Android scannen**:
   - QR-Code scannen
   - Text kopieren
   - Als Datei speichern (z.B. `cert.crt`)

4. **Installieren**:
   - Einstellungen → Sicherheit → Verschlüsselung & Anmeldedaten
   - "Zertifikat installieren" oder "Von SD-Karte installieren"
   - Datei auswählen
   - Name: "Raueberbude Local"
   - Verwendung: "VPN und Apps"

#### Methode 2: Datei-Transfer
1. **Zertifikat kopieren**:
   - `ssl/localhost.crt` per USB, E-Mail, oder Cloud auf Handy
   
2. **Installieren**:
   - Datei öffnen
   - Android fragt nach Installation
   - Name: "Raueberbude Local"
   - Bestätigen

#### Methode 3: Webserver
1. **Temporärer Webserver** (im ssl Ordner):
   ```bash
   cd ssl
   python -m http.server 8000
   ```

2. **Auf Handy öffnen**:
   - Browser: `http://192.168.56.1:8000`
   - `localhost.crt` herunterladen
   - Datei öffnen → Installieren

### iOS (iPhone/iPad)

1. **Zertifikat senden**:
   - Per E-Mail als Anhang
   - Oder per AirDrop
   - Oder über Webserver

2. **Profil installieren**:
   - Datei öffnen
   - "Profil wird heruntergeladen" Meldung
   - Einstellungen → "Profil geladen"
   - "Installieren" tippen
   - Code eingeben (falls nötig)

3. **Zertifikat vertrauen**:
   - Einstellungen → Allgemein → Info
   - "Zertifikatsvertrauensstellungen"
   - Schalter aktivieren für "raueberbude.local"

### Windows (andere PCs)

1. **Doppelklick auf `localhost.pfx`**
2. **Zertifikat-Import-Assistent**:
   - Speicherort: "Aktueller Benutzer"
   - Passwort: `raueberbude2024`
   - Speicherort: "Zertifikate in folgendem Speicher"
   - "Vertrauenswürdige Stammzertifizierungsstellen"
3. **Fertigstellen**

### macOS

1. **Terminal**:
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /pfad/zu/localhost.crt
   ```

2. **Oder Schlüsselbundverwaltung**:
   - Doppelklick auf `localhost.crt`
   - "System" Schlüsselbund
   - Zertifikat suchen
   - Rechtsklick → "Informationen"
   - "Vertrauen" → "Immer vertrauen"

### Linux

```bash
sudo cp localhost.crt /usr/local/share/ca-certificates/raueberbude.crt
sudo update-ca-certificates
```

## Testen

### 1. PC (Host)
```
https://localhost:4200
→ Sollte ohne Warnung laden
```

### 2. Handy/Tablet im selben Netzwerk
```
https://192.168.56.1:4200
→ Nach Zertifikat-Installation: Keine Warnung
→ Mikrofon-Zugriff sollte funktionieren
```

### 3. Mikrofon-Test
1. Seite öffnen
2. Mikrofon-Button klicken
3. Browser fragt nach Mikrofon-Berechtigung
4. ✅ Erlauben
5. ✅ Sprechen funktioniert

## Troubleshooting

### Browser zeigt weiterhin Warnung

**Problem:** "Diese Verbindung ist nicht sicher"

**Lösung:**
1. Zertifikat noch nicht installiert → siehe oben
2. Cache leeren:
   - Chrome: `chrome://settings/clearBrowserData`
   - Haken bei "Gecachte Bilder und Dateien"
   - Löschen
3. Browser neu starten
4. Seite neu laden

### Android: "Keine Zertifikate gefunden"

**Problem:** Datei wird nicht erkannt

**Lösung:**
1. Datei muss `.crt` oder `.cer` Endung haben
2. Datei im Download-Ordner speichern
3. "Dateien"-App öffnen
4. Zertifikat von dort installieren

### iOS: Zertifikat installiert, aber nicht vertraut

**Problem:** Seite lädt nicht

**Lösung:**
1. **Wichtig:** Zertifikatsvertrauensstellungen aktivieren
2. Einstellungen → Allgemein → Info
3. Ganz unten: "Zertifikatsvertrauensstellungen"
4. Schalter für Zertifikat AKTIVIEREN

### Mikrofon trotzdem blockiert

**Problem:** Zugriff verweigert

**Lösung:**
1. **Browser-Einstellungen**:
   - Chrome Android: Einstellungen → Website-Einstellungen → Mikrofon
   - Für `https://192.168.56.1:4200` erlauben

2. **Android System**:
   - Einstellungen → Apps → Chrome → Berechtigungen
   - Mikrofon: Erlauben

3. **Cache leeren**:
   - Chrome → Einstellungen → Datenschutz
   - Browserdaten löschen
   - Neu laden

### Verbindung nicht möglich

**Problem:** Seite lädt nicht

**Lösung:**
1. **Firewall prüfen**:
   ```powershell
   New-NetFirewallRule -DisplayName "Angular Dev Server HTTPS" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow
   ```

2. **IP-Adresse prüfen**:
   ```powershell
   ipconfig
   # Richtige IP verwenden statt 192.168.56.1
   ```

3. **Server läuft?**:
   ```bash
   npm start
   # Sollte zeigen: "HTTPS Dev server running on https://0.0.0.0:4200"
   ```

## Firewall-Regel (Windows)

Falls Verbindung von anderen Geräten nicht klappt:

```powershell
# Als Administrator
New-NetFirewallRule -DisplayName "Angular HTTPS Server" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow -Profile Private,Domain
```

## IP-Adresse finden

**Aktuelle IP des PCs ermitteln:**

```powershell
# PowerShell
ipconfig | findstr "IPv4"
```

**Oder:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object IPAddress
```

**Diese IP auf Handy verwenden:**
```
https://[IHRE-IP]:4200
```

## Alternative: mDNS (Bonjour)

Für einfacheren Zugriff ohne IP-Adresse:

### Windows (Host)
1. **Bonjour Print Services** installieren
   - Von Apple oder iTunes

2. **Hostname nutzen**:
   ```
   https://COMPUTERNAME.local:4200
   ```

### Oder: hosts-Datei auf Geräten

**Android (benötigt Root):**
```bash
echo "192.168.56.1 raueberbude.local" >> /system/etc/hosts
```

**Dann auf Handy:**
```
https://raueberbude.local:4200
```

## Produktions-Deployment

Für echtes Deployment (nicht Dev-Server):

### Nginx mit SSL

```nginx
server {
    listen 443 ssl http2;
    server_name raueberbude.local;
    
    ssl_certificate /pfad/zu/localhost.crt;
    ssl_certificate_key /pfad/zu/localhost.key;
    
    root /pfad/zu/dist/raeuberbude;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Oder Docker mit SSL

```dockerfile
FROM nginx:alpine
COPY ssl/localhost.crt /etc/nginx/ssl/
COPY ssl/localhost.key /etc/nginx/ssl/
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/raeuberbude /usr/share/nginx/html
EXPOSE 443
```

## Zusammenfassung

✅ **Zertifikat erstellt** - `ssl/` Ordner  
✅ **Angular konfiguriert** - HTTPS aktiviert  
✅ **npm script** - `npm start` oder `npm run start:https`  
✅ **Dokumentiert** - Installations-Anleitungen für alle Plattformen  

### Nächste Schritte:

1. **Server starten**: `npm run start:https`
2. **Auf PC testen**: `https://localhost:4200`
3. **Zertifikat auf Handy installieren** (siehe oben)
4. **Auf Handy testen**: `https://192.168.56.1:4200`
5. ✅ **Mikrofon funktioniert!**

Die App läuft jetzt über HTTPS im gesamten lokalen Netzwerk! 🔒

# Handy-Setup: Mikrofon freischalten

## Problem
❌ Fehler auf Handy: "Unsicherer Kontext"  
❌ Mikrofon funktioniert nicht über HTTP

## Lösung
HTTPS mit selbstsigniertem Zertifikat

---

## Schnellstart (3 Schritte)

### 1️⃣ Server starten (PC)
```bash
npm run start:https
```

Server läuft auf: `https://192.168.56.1:4200`

### 2️⃣ Zertifikat auf Handy installieren

#### Android - Einfachste Methode:

1. **PC: Webserver starten**
   ```bash
   cd C:\Users\corat\IdeaProjects\raueberbude\ssl
   python -m http.server 8000
   ```

2. **Handy: Browser öffnen**
   ```
   http://192.168.56.1:8000
   ```

3. **Herunterladen**
   - `localhost.crt` antippen
   - Herunterladen

4. **Installieren**
   - Download-Benachrichtigung → Öffnen
   - ODER: Einstellungen → Sicherheit → "Zertifikat installieren"
   - Name: "Raueberbude"
   - Verwendung: "VPN und Apps"
   - OK

#### iOS - Einfachste Methode:

1. **Zertifikat per E-Mail senden**
   - `ssl/localhost.crt` als Anhang
   - An eigene E-Mail

2. **Auf iPhone öffnen**
   - E-Mail auf iPhone
   - Anhang antippen
   - "Profil installieren"

3. **Vertrauen aktivieren** (WICHTIG!)
   - Einstellungen → Allgemein → Info
   - Ganz unten: "Zertifikatsvertrauensstellungen"
   - Schalter AKTIVIEREN für Zertifikat

### 3️⃣ App öffnen
```
https://192.168.56.1:4200
```

Mikrofon-Button klicken → ✅ Funktioniert!

---

## Firewall freischalten (einmalig)

Falls Verbindung nicht klappt:

**PowerShell als Administrator:**
```powershell
New-NetFirewallRule -DisplayName "Angular HTTPS" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow -Profile Private,Domain
```

---

## Troubleshooting

### Handy: "Diese Verbindung ist nicht sicher"

**Lösung:** Zertifikat noch nicht installiert → siehe Schritt 2

### Handy: Seite lädt nicht

**Prüfen:**
1. ✅ Server läuft? (`npm run start:https`)
2. ✅ IP korrekt? (prüfen: `ipconfig`)
3. ✅ Handy im selben WLAN?
4. ✅ Firewall freigegeben?

### Android: "Keine Zertifikate gefunden"

**Lösung:**
- Datei muss `.crt` Endung haben
- Im Download-Ordner speichern
- Von "Dateien"-App installieren

### iOS: Zertifikat installiert, lädt aber nicht

**Lösung:** Vertrauensstellung aktivieren!
1. Einstellungen → Allgemein → Info
2. "Zertifikatsvertrauensstellungen"
3. Schalter AKTIVIEREN

### Mikrofon trotzdem blockiert

**Lösung:**
1. **Chrome → Einstellungen → Website-Einstellungen → Mikrofon**
   - Für `https://192.168.56.1:4200` erlauben

2. **System-Einstellungen → Apps → Chrome → Berechtigungen**
   - Mikrofon erlauben

3. **Cache leeren + neu laden**

---

## IP-Adresse finden

**Falls andere IP benötigt:**

```powershell
ipconfig | findstr "IPv4"
```

**Diese IP nutzen statt `192.168.56.1`**

---

## Schnelltest

1. ✅ Server: `npm run start:https`
2. ✅ PC Browser: `https://localhost:4200` → lädt?
3. ✅ Handy Browser: `https://192.168.56.1:4200` → lädt?
4. ✅ Mikrofon-Button → grün?
5. ✅ Sprechen → Text erscheint?

**Alles ✅ → Fertig!** 🎉

---

## Für alle Terminals

Zertifikat auf **jedem** Gerät installieren:
- ✅ Alle Handys
- ✅ Alle Tablets
- ✅ Alle PCs im Netzwerk

**Einmal installieren = für immer (10 Jahre gültig)**

---

## Zusammenfassung

✅ **Server über HTTPS**: `npm run start:https`  
✅ **Zertifikat installieren**: Android/iOS siehe oben  
✅ **App öffnen**: `https://192.168.56.1:4200`  
✅ **Mikrofon nutzen**: Funktioniert! 🎤

Vollständige Anleitung: `docs/HTTPS_SETUP.md`

# 🎤 Mikrofon auf Handy aktivieren

## ℹ️ Wann ist das nötig?

**In den meisten Fällen: NICHT!** Die App sollte nach Login und Mikrofon-Berechtigung einfach funktionieren.

**Nur wenn** dein Browser Mikrofon bei HTTP blockiert (Fehlermeldung im Browser), dann folge dieser Anleitung:

## ⏱️ 30 Sekunden Setup (Chrome Android)

### Schritt 1: IP herausfinden (am PC)

Öffne PowerShell:
```powershell
ipconfig | Select-String "IPv4"
```

Notiere deine IP (z. B. `192.168.178.25`)

---

### Schritt 2: Chrome-Flag setzen (auf Handy)

1. **Öffne Chrome** auf dem Handy
2. Gib in die Adresszeile ein: `chrome://flags`
3. **Suche:** "Insecure origins treated as secure"
4. **Trage ein:** `http://192.168.178.25:4301` (deine IP + `:4301`)
5. Setze auf **"Enabled"**
6. Klicke **"Relaunch"**

---

### Schritt 3: App öffnen

```powershell
# Am PC starten
npm run start:network
```

**Auf dem Handy öffnen:** `http://192.168.178.25:4301` (deine IP)

---

## ✅ Fertig!

Mikrofon funktioniert jetzt auch über HTTP (ohne HTTPS/Zertifikate/ngrok).

---

## 💡 Warum funktioniert das?

Browser blockieren Mikrofon bei HTTP aus Sicherheitsgründen. Mit dem Flag sagst du Chrome: "Diese IP ist sicher, erlaube Mikrofon."

---

## 🔧 Mehrere IPs?

Wenn du mehrere Netzwerke nutzt (z. B. WLAN + VPN), trenne mit Komma:

```
http://192.168.178.25:4301,http://192.168.56.1:4301
```

---

## ❓ Probleme?

**Mikrofon wird trotzdem blockiert?**
→ Chrome neu gestartet? (Relaunch-Button geklickt?)

**Flag-Einstellung nicht gefunden?**
→ Chrome updaten (mind. Version 90+)

**IP ändert sich ständig?**
→ Im Router feste IP vergeben (DHCP-Reservierung)

Mehr: [docs/SSL_SETUP.md](SSL_SETUP.md)

# ⚠️ WICHTIG: Server starten

## Problem mit `npm run restart`

**`npm run restart` startet NUR Angular Dev-Server!**

Fehler wie:
```
[vite] http proxy error: /api/speech/terminals/register
AggregateError [ECONNREFUSED]
```

= Backend-Server laufen nicht!

---

## ✅ Richtig: Alle Server starten

### Lokal (nur auf diesem PC)
```bash
npm run start:dev
```
Öffne: `http://localhost:4200`

### Mit Netzwerkzugriff (für mobile Geräte)

**Empfohlen - Sequenzieller Start (Backend zuerst):**
```bash
npm run start:network:seq
```
→ Backend-Server starten zuerst (15 Sek.), dann Angular  
→ **Kein ECONNREFUSED** mehr beim Start!

**Alternative - Parallel (alle gleichzeitig):**
```bash
npm run start:network
```
→ Kann ECONNREFUSED-Fehler beim Start geben (verschwindet nach ~20 Sek.)

Öffne:
- Lokal: `http://localhost:4301`
- Mobil: `http://<DEINE-IP>:4301`

Das startet:
- ✅ Backend Express (Port 3000)
- ✅ NestJS (Port 3001)  
- ✅ Angular Dev (Port 4200)

---

## IP-Adresse finden

```bash
ipconfig
```

Suche nach "IPv4-Adresse" (z.B. `192.168.178.25`)

---

## Alternative: Manuell in separaten Terminals

```bash
# Terminal 1
cd backend
npm start

# Terminal 2
cd backend/nest-app
npm run start:dev

# Terminal 3
npm start
```

---

## Server-Status prüfen

```powershell
netstat -ano | findstr ":3000 :3001 :4200" | findstr "ABH"
```

Alle 3 Ports müssen angezeigt werden!

---

Siehe auch: `docs/START_ALL_SERVERS.md`

# Raeuberbude - Quick Reference

## 🚀 Schnellstart

### ⚠️ WICHTIG: Alle 3 Server müssen laufen!

Die App benötigt:
1. **Backend Express** (Port 3000) - Transcripts, Intent-Logs
2. **NestJS** (Port 3001) - Speech-API, Home Assistant  
3. **Angular Dev-Server** (Port 4200) - Frontend mit Proxy

### Alle Server starten

**Option 1: Mit concurrently (empfohlen)**
```bash
npm run start:dev
```
Startet alle 3 Server gleichzeitig im selben Terminal.

**Option 2: Manuell in separaten Terminals**
```bash
# Terminal 1: Backend Express
cd backend
npm start

# Terminal 2: NestJS
cd backend/nest-app
npm run start:dev

# Terminal 3: Angular Dev-Server
npm start
```

**Option 3: BAT-Script (Windows)**
```bash
npm run start-all
```
Öffnet 3 separate CMD-Fenster für jeden Server.

### Browser öffnen
```
http://localhost:4200
```

---

## ⚠️ Häufiger Fehler!

### `npm run restart` startet NUR Angular!

**Symptom:**
```
[vite] http proxy error: /api/speech/terminals/register
AggregateError [ECONNREFUSED]
```

**Ursache:**
- `npm run restart` = `npm stop && npm start`
- Startet **NUR** Angular Dev-Server
- Backend Express (3000) und NestJS (3001) fehlen!

**Lösung:**
```bash
# Statt npm run restart:
npm run start:dev
```

---

## 📊 Server-Status prüfen

```powershell
netstat -ano | findstr ":3000 :3001 :4200" | findstr "ABH"
```

**Erwartete Ausgabe:**
```
TCP    [::]:3000    ...    ABHÖREN    <PID>
TCP    [::]:3001    ...    ABHÖREN    <PID>
TCP    [::1]:4200   ...    ABHÖREN    <PID>
```

---

## 🔧 Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm start` | ⚠️ Nur Angular Dev-Server |
| `npm run start:dev` | ✅ Alle 3 Server (empfohlen) |
| `npm run start-all` | ✅ Alle 3 Server (separate Fenster) |
| `npm run restart` | ⚠️ Nur Angular neu starten |
| `npm run check-ports` | Port-Status anzeigen |

---

## 🎯 Server-Architektur

```
Browser (localhost:4200)
    ↓ [Angular Proxy]
    |
    ├─ /api/speech          → NestJS (3001)
    ├─ /api/homeassistant   → NestJS (3001)
    ├─ /api/transcripts     → Backend Express (3000)
    ├─ /api/intent-logs     → Backend Express (3000)
    └─ /api/*               → Home Assistant (8123)
```

---

## 🐛 Troubleshooting

### ECONNREFUSED bei /api/speech
**Ursache:** NestJS (3001) läuft nicht  
**Lösung:**
```bash
cd backend/nest-app
npm run start:dev
```

### 404 auf /api/intent-logs
**Ursache:** Backend Express (3000) läuft nicht  
**Lösung:**
```bash
cd backend
npm start
```

### Alle Server stoppen
```powershell
Get-Process node | Stop-Process -Force
```

---

## 📚 Weitere Dokumentation

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Detaillierte Fehlerbehandlung
- [PROXY_CORS_SETUP.md](./PROXY_CORS_SETUP.md) - Proxy-Konfiguration
- [INTENT_LOGS_API.md](./INTENT_LOGS_API.md) - Intent-Logs API

---

## ✅ Checkliste

Vor dem Testen:
- [ ] Alle 3 Server laufen? (`npm run start:dev`)
- [ ] Browser auf `localhost:4200`?
- [ ] MongoDB läuft? (`Get-Process mongod`)
- [ ] Keine Proxy-Fehler im Terminal?

**Dann sollte alles funktionieren! 🎉**

