# Raeuberbude - Troubleshooting Guide

## Schnellstart

### Server starten
```bash
npm run start:dev
```

**Startet automatisch:**
- Angular Dev-Server (Port 4200)
- Backend Express (Port 3000)
- NestJS (Port 3001)

### Browser öffnen
```
http://localhost:4200
```

**❌ NICHT:**
- `http://localhost:4301` (falscher Port!)
- `http://192.168.178.25:4301` (umgeht Proxy!)

---

## Häufige Probleme

### 1. 404 auf http://localhost:4200

**Symptom:**
```
GET http://localhost:4200/ 404 (Not Found)
```

**Ursache:** Dev-Server läuft nicht oder ist abgestürzt

**Lösung:**
```bash
# Stoppe alte Prozesse
Get-Process node | Where-Object {$_.Path -like "*raueberbude*"} | Stop-Process -Force

# Starte neu
npm start
```

**Oder nutze Restart-Script:**
```bash
npm run restart
```

---

### 2. CORS-Fehler

**Symptom:**
```
Access to XMLHttpRequest at 'http://192.168.178.25:4301/api/transcripts' 
from origin 'http://localhost:4301' has been blocked by CORS policy
```

**Ursache:** Du nutzt den falschen Port oder absolute URLs

**Lösung:**

1. **Prüfe URL im Browser:**
   - ✅ Sollte sein: `http://localhost:4200`
   - ❌ NICHT: `http://localhost:4301`

2. **Prüfe ob Proxy läuft:**
   ```bash
   # Dev-Server MUSS mit Proxy-Config gestartet sein
   npm start  # nutzt automatisch proxy.conf.cjs
   ```

3. **Prüfe Services:**
   - Alle API-Calls müssen relative URLs verwenden (`/api/...`)
   - KEINE absoluten URLs wie `http://192.168.178.25:4301/api/...`

---

### 3. Port bereits belegt

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::4200
```

**Ursache:** Ein alter Prozess blockiert den Port

**Lösung:**
```powershell
# Finde Prozess auf Port 4200
netstat -ano | findstr ":4200" | findstr "ABH"

# Stoppe Prozess (ersetze PID)
Stop-Process -Id <PID> -Force

# Oder stoppe alle Node-Prozesse
Get-Process node | Stop-Process -Force
```

---

### 4. 404 auf /api/intent-logs

**Symptom:**
```
POST http://localhost:4200/api/intent-logs 404 (Not Found)
```

**Ursache:** Backend Express läuft nicht

**Lösung:**
```bash
# Prüfe ob Backend läuft
netstat -ano | findstr ":3000"

# Starte Backend
cd backend
npm start
```

---

### 5. Doppelte Prozesse auf Port 4200

**Symptom:**
```
TCP    0.0.0.0:4200    0.0.0.0:0    ABHÖREN    12345
TCP    0.0.0.0:4200    0.0.0.0:0    ABHÖREN    67890
```

**Ursache:** Server wurde mehrmals gestartet

**Lösung:**
```powershell
# Stoppe ALLE Prozesse auf Port 4200
$pids = netstat -ano | Select-String ":4200" | ForEach-Object { 
    ($_ -split '\s+')[-1] 
} | Select-Object -Unique

foreach($p in $pids) {
    if($p -match '^\d+$') {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

# Warte 2 Sekunden
Start-Sleep -Seconds 2

# Starte neu
npm start
```

---

### 6. Cannot GET /api/...

**Symptom:**
```
Cannot GET /api/intent-logs
```

**Ursache:** Alte Server-Version läuft noch (ohne neue Endpunkte)

**Lösung:**
```powershell
# Stoppe Backend
Get-Process node | Where-Object {$_.Path -like "*backend*"} | Stop-Process -Force

# Starte Backend neu (lädt neue Änderungen)
cd backend
npm start
```

---

## Server-Architektur

### Korrekte Konfiguration:
```
Browser → http://localhost:4200 (Angular Dev mit Proxy)
    ↓
    /api/speech          → http://localhost:3001 (NestJS)
    /api/homeassistant   → http://localhost:3001 (NestJS)
    /api/transcripts     → http://localhost:3000 (Backend Express)
    /api/intent-logs     → http://localhost:3000 (Backend Express)
    /api/*               → http://homeassistant.local:8123 (Home Assistant)
```

### Ports:
| Service | Port | Status-Check |
|---------|------|--------------|
| Angular Dev | 4200 | `http://localhost:4200` |
| Backend Express | 3000 | `http://localhost:3000/api/intent-logs` |
| NestJS | 3001 | `http://localhost:3001/api/speech` |
| MongoDB | 27017 | - |

---

## Hilfreiche Befehle

### Port-Status prüfen
```powershell
netstat -ano | Select-String ":3000|:3001|:4200" | Select-String "ABH"
```

### Alle Server neu starten
```bash
npm run start:dev
```

### Einzelne Server starten
```bash
# Angular
npm start

# Backend Express
cd backend && npm start

# NestJS
cd backend/nest-app && npm run start:dev
```

### Port freigeben
```powershell
# Finde PID
$pid = (netstat -ano | Select-String ":4200" | Select-String "ABH" | Select-Object -First 1 | ForEach-Object { ($_ -split '\s+')[-1] })

# Stoppe Prozess
Stop-Process -Id $pid -Force
```

### Browser-Cache leeren
```
Strg + Shift + R (Hard Reload)
```

---

## Checkliste bei Problemen

- [ ] Läuft der richtige Port? (`localhost:4200` nicht `4301`)
- [ ] Laufen alle Server? (3000, 3001, 4200)
- [ ] Proxy-Config geladen? (`npm start` mit `--proxy-config`)
- [ ] Keine doppelten Prozesse? (`netstat` prüfen)
- [ ] Browser-Cache geleert? (Strg + Shift + R)
- [ ] MongoDB läuft? (`Get-Process mongod`)

---

## Nützliche Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm start` | Startet Angular Dev mit Proxy |
| `npm run start:dev` | Startet alle 3 Server |
| `npm run restart` | Startet Angular Dev neu |
| `npm run check-ports` | Zeigt Port-Belegung |

---

## Logs prüfen

### Angular Dev-Server
```
Terminal-Output ansehen beim Start mit npm start
```

### Backend Express
```
Terminal-Output oder backend/logs/
```

### NestJS
```
Terminal-Output oder backend/nest-app/logs/
```

---

## Bei anhaltenden Problemen

1. **Kompletter Neustart:**
   ```powershell
   # Stoppe ALLE Node-Prozesse
   Get-Process node | Stop-Process -Force
   
   # Warte 5 Sekunden
   Start-Sleep -Seconds 5
   
   # Starte alle Server
   npm run start:dev
   ```

2. **Prüfe Dokumentation:**
   - `docs/PROXY_CORS_SETUP.md` - Proxy-Konfiguration
   - `docs/PORT_4200_NOT_4301.md` - Port-Problem
   - `docs/INTENT_LOGS_API.md` - Intent-Logs API

3. **Prüfe Terminal-Output:**
   - Fehlermeldungen beim Server-Start
   - CORS-Fehler
   - Port-Konflikte

---

## Status-Check Script

```powershell
Write-Host "`nServer Status Check:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$ports = @{
    4200 = @{name='Angular Dev'; url='http://localhost:4200'}
    3000 = @{name='Backend Express'; url='http://localhost:3000/api/intent-logs'}
    3001 = @{name='NestJS'; url='http://localhost:3001/api/speech'}
}

foreach($port in $ports.Keys) {
    $listening = netstat -ano | Select-String ":$port" | Select-String "ABH" | Select-Object -First 1
    if($listening) {
        try {
            $response = Invoke-WebRequest -Uri $ports[$port].url -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ $($ports[$port].name) (Port $port) - OK" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  $($ports[$port].name) (Port $port) - Running but not responding" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ $($ports[$port].name) (Port $port) - NOT RUNNING" -ForegroundColor Red
    }
}
```

---

**Bei weiteren Fragen:** Siehe Dokumentation in `docs/` Ordner

