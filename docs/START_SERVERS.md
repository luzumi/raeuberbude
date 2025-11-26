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

