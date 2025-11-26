# Mobile Geräte - Zugriff auf Raeuberbude

## ✅ Problem behoben!

Die Server wurden konfiguriert um auf allen Netzwerk-Interfaces zu lauschen (0.0.0.0).

---

## 🚀 Server starten für Netzwerkzugriff

```bash
npm run start:network
```

Dies startet:
- Backend Express auf **0.0.0.0:3000**
- NestJS auf **0.0.0.0:3001**
- Angular Dev auf **0.0.0.0:4200**

---

## 📱 Von mobilem Gerät zugreifen

### 1. Finde deine IP-Adresse

**Windows:**
```bash
ipconfig
```
Suche nach "IPv4-Adresse" unter deinem WLAN/Ethernet Adapter  
Beispiel: `192.168.178.25`

### 2. Öffne auf mobilem Gerät

```
http://<DEINE-IP>:4200
```

Beispiel:
```
http://192.168.178.25:4200
```

---

## 🔥 Firewall-Regel (Windows)

Falls die Seite nicht erreichbar ist:

### Option 1: Firewall-Regel erstellen (empfohlen)

```powershell
# Als Administrator ausführen
New-NetFirewallRule -DisplayName "Raeuberbude Dev Server" `
  -Direction Inbound `
  -LocalPort 3000,3001,4200 `
  -Protocol TCP `
  -Action Allow
```

### Option 2: Firewall temporär deaktivieren (nur zum Testen!)

```powershell
# Als Administrator
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Wieder aktivieren nach Test:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### Option 3: Manuell über Windows-Einstellungen

1. Windows-Suche: "Firewall"
2. "Windows Defender Firewall mit erweiterter Sicherheit"
3. "Eingehende Regeln" → "Neue Regel"
4. Port → TCP → Bestimmte lokale Ports: `3000,3001,4200`
5. Verbindung zulassen → Fertigstellen

---

## ⚠️ Häufige Probleme

### Seite lädt nicht

**Ursache 1: Firewall blockiert**
→ Siehe Firewall-Regel oben

**Ursache 2: Falsches Netzwerk**
→ Handy muss im gleichen WLAN sein wie PC!

**Ursache 3: VPN aktiv**
→ VPN auf PC oder Handy kann Zugriff blockieren

### Prüfe ob Server erreichbar sind

**Vom PC aus:**
```bash
# Test Backend Express
curl http://localhost:3000/api/intent-logs

# Test NestJS
curl http://localhost:3001/api/speech

# Test Angular
curl http://localhost:4200
```

**Vom Handy aus:**
```
http://<PC-IP>:3000/api/intent-logs
http://<PC-IP>:3001/api/speech
http://<PC-IP>:4200
```

---

## 🔧 Code-Änderungen (bereits gemacht)

### Backend Express (backend/server.js)
```javascript
// Vorher:
app.listen(3000, () => { ... });

// Nachher:
app.listen(3000, '0.0.0.0', () => { ... });
```

### NestJS (backend/nest-app/src/main.ts)
```typescript
// Vorher:
await app.listen(port);

// Nachher:
await app.listen(port, '0.0.0.0');
```

### Angular (package.json - start:network)
```json
"ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.cjs"
```

---

## 🎯 404 bei POST /api/intent-logs

**Problem:** Server lief nicht oder alte Version

**Lösung:**
1. Alle Server stoppen (siehe CMD-Fenster)
2. Neu starten: `npm run start:network`
3. Warten bis alle 3 Server laufen
4. Testen: `curl http://localhost:3000/api/intent-logs`

---

## 📊 Server-Status prüfen

```powershell
netstat -ano | findstr ":3000 :3001 :4200"
```

**Erwartete Ausgabe:**
```
TCP    0.0.0.0:3000    0.0.0.0:0    ABHÖREN    <PID>
TCP    0.0.0.0:3001    0.0.0.0:0    ABHÖREN    <PID>
TCP    0.0.0.0:4200    0.0.0.0:0    ABHÖREN    <PID>
```

Das `0.0.0.0` bedeutet: Server ist von außen erreichbar!

---

## ✅ Checkliste

- [ ] Server mit `npm run start:network` gestartet?
- [ ] IP-Adresse des PCs ermittelt? (`ipconfig`)
- [ ] Handy im gleichen WLAN wie PC?
- [ ] Firewall-Regel erstellt?
- [ ] Auf Handy `http://<PC-IP>:4200` aufgerufen?

**Wenn alles ja: App sollte erreichbar sein! 🎉**

