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

