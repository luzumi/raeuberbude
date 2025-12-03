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

