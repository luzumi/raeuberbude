# 🔧 Spracheingabe Troubleshooting

## Problem: Mikrofon funktioniert nicht auf dem Handy

### Schritt 1: Grundlegende Checks

**A) Browser-Berechtigung prüfen:**
1. Öffne die App im Browser
2. Login durchführen
3. Auf das Mikrofon-Symbol klicken
4. Browser fragt nach Mikrofon-Berechtigung → **"Erlauben"** wählen

**B) Netzwerkverbindung prüfen:**
- Handy und PC im gleichen WLAN?
- PC-Firewall blockiert Port 4301?
- Backend läuft? (sollte auf `http://localhost:3001` erreichbar sein)

**C) IP-Adresse korrekt?**
```powershell
# Am PC prüfen:
ipconfig | Select-String "IPv4"
```
→ Diese IP am Handy verwenden (z. B. `http://192.168.178.25:4301`)

---

### Schritt 2: Browser-spezifische Probleme

**Chrome auf Android:**
Wenn Mikrofon trotz Berechtigung nicht funktioniert:
1. `chrome://flags` öffnen
2. "Insecure origins treated as secure" suchen
3. Deine IP hinzufügen: `http://192.168.178.25:4301`
4. Auf "Enabled" setzen → "Relaunch"

Siehe [MIKROFON_SETUP.md](MIKROFON_SETUP.md) für Details.

**Firefox auf Android:**
1. `about:config` öffnen
2. `media.devices.insecure.enabled` → auf `true`
3. `media.getusermedia.insecure.enabled` → auf `true`

**Safari auf iOS:**
- Nutze Chrome auf iOS (Safari hat eingeschränkte Unterstützung)
- Oder: Nur am PC testen

---

### Schritt 3: Backend-Transkription prüfen

**A) Backend läuft?**
```powershell
# Im Browser öffnen:
http://localhost:3001/health
```
Sollte `{"ok": true}` zurückgeben.

**B) Backend-Logs prüfen:**
```powershell
# Terminal mit Backend ansehen (npm run start:network läuft)
# Suche nach Fehlern wie:
# - "Whisper not available"
# - "VOSK model not found"
# - MongoDB connection error
```

**C) STT-Provider checken:**
Die App nutzt automatisch:
1. **Browser STT** (Web Speech API, online nötig)
2. **Server STT** (Whisper oder VOSK, offline möglich)

Wenn Browser-STT nicht geht, wechselt die App automatisch zu Server-STT.

---

### Schritt 4: Detaillierte Diagnose

**Console-Logs prüfen (Browser DevTools):**

1. Chrome auf Android: 
   - PC: Chrome öffnen → `chrome://inspect`
   - Handy per USB verbinden
   - Gerät auswählen → "Inspect"
   
2. Suche nach Fehlern wie:
   - `NotAllowedError` → Berechtigung fehlt
   - `NotFoundError` → Kein Mikrofon gefunden
   - `SecurityError` → Browser blockiert HTTP-Zugriff
   - Network errors → Backend nicht erreichbar

---

### Schritt 5: Workarounds

**Option A: Am PC testen**
```powershell
npm start
# Öffne http://localhost:4200
```
Funktioniert das? → Problem liegt am Handy/Netzwerk

**Option B: Server-STT erzwingen**
In `speech.service.ts` (temporär zum Testen):
```typescript
private sttMode: STTMode = 'server'; // statt 'auto'
```

**Option C: Logs aktivieren**
In Browser-Console:
```javascript
localStorage.setItem('debug', 'true');
```
Dann App neu laden → mehr Logs in Console.

---

## Häufige Fehlermeldungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| "Mikrofon-API nicht verfügbar" | Browser zu alt | Browser updaten (Chrome 60+) |
| "Mikrofon-Zugriff blockiert" | Berechtigung verweigert | Browser-Einstellungen → Mikrofon erlauben |
| "Keine Sprache erkannt" | Zu leise / zu kurz | Lauter sprechen, länger sprechen |
| "Network error" | Keine Internetverbindung | WLAN prüfen (Browser-STT braucht Internet) |
| "Backend nicht erreichbar" | Backend läuft nicht | `npm run start:network` starten |

---

## Weitere Hilfe

1. **GitHub Issues:** Erstelle ein Issue mit:
   - Browser + Version (z. B. "Chrome 120 auf Android 13")
   - Fehlermeldung (Screenshot)
   - Console-Logs (falls vorhanden)

2. **Docs:**
   - [MIKROFON_SETUP.md](MIKROFON_SETUP.md) - Browser-Flag Setup
   - [SSL_SETUP.md](SSL_SETUP.md) - Alternative Browser
   - [README.md](../README.md) - Quick Start

3. **Alternative:** 
   - Text-Eingabe statt Sprache (falls verfügbar)
   - Desktop-Version nutzen (`npm start` → `localhost:4200`)

