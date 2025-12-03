# Server Start Modi - Übersicht

## Problem: ERR_EMPTY_RESPONSE

**Ursache:** Server läuft nur auf `127.0.0.1` (localhost only) statt auf allen Interfaces.

## Lösung: Richtige Start-Konfiguration

### 3 Start-Modi verfügbar:

## 1. Localhost (Standard) - NUR auf diesem PC

```bash
npm start
# oder
ng serve
```

**Erreichbar:**
- ✅ `http://localhost:4200` (nur dieser PC)
- ❌ NICHT vom Handy/Tablet

**Wann nutzen:**
- Entwicklung am PC
- Mikrofon nur am PC testen

## 2. Netzwerk (HTTP) - Alle Geräte, OHNE SSL

```bash
npm run start:network
# oder
ng serve --configuration network
```

**Erreichbar:**
- ✅ `http://localhost:4301` (PC)
- ✅ `http://192.168.56.1:4301` (Handy/Tablet)
- ⚠️ **ABER:** Mikrofon funktioniert NUR auf PC (localhost)
- ❌ Mikrofon auf Handy **BLOCKIERT** (HTTP unsicher)

**Wann nutzen:**
- Testen ohne Zertifikat
- Nur UI testen (kein Mikrofon auf Handy)

## 3. Netzwerk (HTTPS) - Alle Geräte, MIT SSL ✅ EMPFOHLEN

```bash
npm run start:https
# oder
ng serve --configuration https
```

**Erreichbar:**
- ✅ `https://localhost:4200` (PC)
- ✅ `https://192.168.56.1:4200` (Handy/Tablet nach Zertifikat-Installation)
- ✅ **Mikrofon funktioniert überall!**

**Wann nutzen:**
- **IMMER wenn Handy/Tablet genutzt werden soll**
- Produktiv-ähnliche Umgebung
- Mikrofon im Netzwerk

## Vergleich

| Modus | Command | Port | Host | SSL | Mikrofon PC | Mikrofon Handy |
|-------|---------|------|------|-----|-------------|----------------|
| Localhost | `npm start` | 4200 | 127.0.0.1 | ❌ | ✅ | ❌ (nicht erreichbar) |
| Network | `npm run start:network` | 4301 | 0.0.0.0 | ❌ | ✅ | ❌ (HTTP blockiert) |
| HTTPS | `npm run start:https` | 4200 | 0.0.0.0 | ✅ | ✅ | ✅ (mit Zertifikat) |

## Empfehlung für Ihr Setup

### Für Multi-Terminal (Handy/Tablet):

**1. Server starten:**
```bash
npm run start:https
```

**2. Zertifikat-Server (für neue Geräte):**
```bash
# In zweitem Terminal
npm run serve:cert
```

**3. Auf Handy:**
```
http://192.168.56.1:8000     → Zertifikat installieren
https://192.168.56.1:4200    → App nutzen
```

### Für lokale Entwicklung (nur PC):

```bash
npm start
# oder
ng serve --port 4301
```

## Häufige Fehler

### "ERR_EMPTY_RESPONSE" oder "Diese Seite funktioniert nicht"

**Ursache:** Server läuft nur auf localhost (127.0.0.1)

**Lösung:**
```bash
# FALSCH:
ng serve --port 4301

# RICHTIG:
ng serve --host 0.0.0.0 --port 4301
# oder
npm run start:network
```

### "Unsicherer Kontext" oder Mikrofon blockiert (Handy)

**Ursache:** HTTP statt HTTPS

**Lösung:**
```bash
# HTTPS nutzen:
npm run start:https

# Zertifikat installieren (einmalig):
npm run serve:cert
```

### "Diese Verbindung ist nicht sicher" (Handy über HTTPS)

**Ursache:** Zertifikat nicht installiert

**Lösung:**
1. `npm run serve:cert`
2. Auf Handy: `http://192.168.56.1:8000`
3. Zertifikat herunterladen & installieren
4. Siehe: `docs/HANDY_SETUP.md`

### Seite lädt nicht vom Handy

**Checkliste:**
1. ✅ Server mit `--host 0.0.0.0` gestartet?
2. ✅ Firewall freigegeben? (Port 4200 oder 4301)
3. ✅ Handy im selben WLAN?
4. ✅ IP-Adresse korrekt? (`ipconfig`)

**Firewall freigeben:**
```powershell
# Als Administrator
New-NetFirewallRule -DisplayName "Angular Dev Server" -Direction Inbound -Protocol TCP -LocalPort 4200,4301 -Action Allow -Profile Private,Domain
```

## Troubleshooting

### Server läuft, aber nur auf 127.0.0.1

**Prüfen:**
```powershell
netstat -ano | findstr :4301
```

**Sollte zeigen:**
```
TCP    0.0.0.0:4301           0.0.0.0:0              ABHÖREN
```

**NICHT:**
```
TCP    127.0.0.1:4301         ...
```

**Fix:**
```bash
# Server stoppen (Strg+C)
# Neu starten:
npm run start:network
# oder mit HTTPS:
npm run start:https
```

### IP-Adresse finden

```powershell
ipconfig | findstr "IPv4"
```

Oder:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object IPAddress
```

## Konfiguration

Die Konfigurationen sind in `angular.json` definiert:

### development (Standard)
```json
{
  "buildTarget": "raeuberbude:build:development"
}
```
→ Port 4200, localhost only, kein SSL

### network
```json
{
  "buildTarget": "raeuberbude:build:development",
  "host": "0.0.0.0",
  "port": 4301
}
```
→ Port 4301, alle Interfaces, kein SSL

### https
```json
{
  "buildTarget": "raeuberbude:build:development",
  "ssl": true,
  "sslCert": "ssl/localhost.crt",
  "sslKey": "ssl/localhost.key",
  "host": "0.0.0.0",
  "port": 4200
}
```
→ Port 4200, alle Interfaces, SSL aktiviert

## Empfohlener Workflow

### Entwicklung am PC:
```bash
npm start
# http://localhost:4200
```

### Testen im Netzwerk (ohne Mikrofon):
```bash
npm run start:network
# http://192.168.56.1:4301
```

### Produktiv mit Handys/Tablets:
```bash
npm run start:https
# https://192.168.56.1:4200
# + Zertifikat auf Geräten installieren
```

## Zusammenfassung

**Problem:** Server nicht erreichbar  
**Ursache:** Läuft nur auf 127.0.0.1

**Lösung:**

**Für Netzwerk (HTTP, kein Mikrofon auf Handy):**
```bash
npm run start:network
→ http://192.168.56.1:4301
```

**Für Netzwerk (HTTPS, Mikrofon funktioniert):**
```bash
npm run start:https
→ https://192.168.56.1:4200
→ Zertifikat installieren: npm run serve:cert
```

**Für localhost (nur PC):**
```bash
npm start
→ http://localhost:4200
```

✅ **Jetzt sollte alles funktionieren!**

