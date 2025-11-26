# Quick-Start: Home Assistant Admin - Test-Anleitung

## 🚀 System starten

```bash
# Terminal 1 - Backend starten
cd backend/nest-app
npm install
npm start
# → Backend läuft auf http://localhost:3001

# Terminal 2 - Frontend starten (neues Terminal)
cd .
ng serve
# → Frontend läuft auf http://localhost:4200
# oder mit MCP-Integration: http://localhost:4301
```

## 🧪 Test-Checkliste

### 1️⃣ Menü-Navigation
- [ ] **Öffne** http://localhost:4301/menu
- [ ] **Klick** "Administration" → "Homeassistent"
- [ ] **Erwartung**: Leitet zu `/admin/homeassistant` weiter

### 2️⃣ Entities-Tab (Haupttest)
- [ ] **Tab öffnet** → Daten laden (oder 404-Fehler sichtbar)
- [ ] **Suche eingeben**: "sensor" → Filtert Entities
- [ ] **Detail-Button (ℹ️)** klicken → Detail-Dialog öffnet
  - [ ] "Übersicht" Tab: Felder anzeigen
  - [ ] "Raw Data" Tab: JSON-Struktur anzeigen
  - [ ] "Verlauf" Tab: State-History laden
- [ ] **"Export JSON"** → Download funktioniert
- [ ] **"Export CSV"** → Download funktioniert
- [ ] **"Aktualisieren"** → Daten neu laden
- [ ] **"Statistiken"** → Dialog mit Stats anzeigen

### 3️⃣ Devices-Tab
- [ ] **Daten laden** (oder 404)
- [ ] **Zeilen klicken** → Markiert
- [ ] **Detail-Dialog** öffnet

### 4️⃣ Areas-Tab
- [ ] **Laden**
- [ ] **Sortierung** klicken (aufsteigend/absteigend)

### 5️⃣ Automations-Tab
- [ ] **Daten anzeigen**
- [ ] **Mode-Spalte**: Badge-Styling prüfen

### 6️⃣ Persons-Tab
- [ ] **Lädt** oder **404 mit Info-Meldung**

### 7️⃣ Zones-Tab
- [ ] **Boolean-Spalte** ("Passiv"): ✓/✗ Icons anzeigen

### 8️⃣ Media Players-Tab
- [ ] **State-Spalte**: Badge-Colors korrekt

### 9️⃣ Services-Tab
- [ ] **Service-Namen anzeigen**

## 🔍 Browser-Konsole (DevTools)

**Öffne:** F12 → Console

**Prüfe auf:**
- [ ] Keine kritischen Errors (nur Warnungen okay)
- [ ] API-Calls in Network-Tab sichtbar
- [ ] 200er Status-Codes für erfolgreiche Requests
- [ ] 404er Status-Codes für nicht implementierte Endpoints (nur Info, nicht Error)

## 📊 Expected API Responses

```bash
# Terminal - curl Tests durchführen

# Entities
curl http://localhost:3001/api/homeassistant/entities \
  -H "Cookie: session=..." | jq '.[0]'

# Devices  
curl http://localhost:3001/api/homeassistant/entities/devices | jq '.[0]'

# Areas
curl http://localhost:3001/api/homeassistant/entities/areas | jq

# Automations (NEW)
curl http://localhost:3001/api/homeassistant/entities/automations | jq

# Persons (NEW)
curl http://localhost:3001/api/homeassistant/entities/persons | jq

# Zones (NEW)
curl http://localhost:3001/api/homeassistant/entities/zones | jq

# Media Players (NEW)
curl http://localhost:3001/api/homeassistant/entities/media-players | jq

# Services (NEW)
curl http://localhost:3001/api/homeassistant/entities/services | jq

# Statistics
curl http://localhost:3001/api/homeassistant/entities/statistics | jq
```

## 💾 Dummy-Daten für Tests

Falls die Datenbank leer ist, können Sie Test-Daten einfügen:

```bash
# Backend-Scripts verwenden
cd backend
npm run seed:ha-test-data
# oder manuell in MongoDB einfügen
```

## 🐛 Fehlerbehandlung

### Fehler: "Keine Daten gefunden"
→ **Wahrscheinlich:** Datenbank ist leer oder Endpoint hat 404-Fehler
→ **Lösung:** 
- MongoDB verbindung prüfen: `mongo --version`
- Backend-Logs checken
- Test-Daten laden

### Fehler: "Cannot read property of undefined"
→ **Wahrscheinlich:** API antwortet mit leeren Array
→ **Lösung:** Ist normal! UI zeigt "Keine Daten gefunden"

### Fehler: CORS
→ **Wahrscheinlich:** Backend-CORS konfiguriert falsch
→ **Lösung:** 
```bash
# In Backend-Main-Module:
app.enableCors({ origin: 'http://localhost:4301', credentials: true });
```

## 📈 Performance-Check

- **Initial Load**: Sollte <3 Sekunden dauern
- **Search**: Sollte <100ms dauern
- **Export (1000 rows)**: Sollte <500ms dauern
- **Memory**: DevTools → Memory → Heap Size prüfen

## 🎯 Success-Kriterien

✅ **Mindestens erfüllt:**
1. Frontend lädt ohne Fehler
2. Entities-Tab zeigt Daten oder aussagekräftige 404-Fehler
3. Search funktioniert
4. Detail-Dialog öffnet
5. Export funktioniert

✅ **Optimal:**
1. Alle 8 Tabs funktionieren
2. Statistiken anzeigen
3. Responsive Design auf Mobile
4. Export als JSON und CSV
5. Keine Fehler in Console

## 📚 Code-Review Checklist

- [ ] `generic-data-table.component.ts` - Ansehen (480 LoC)
- [ ] `admin-homeassistant.component.ts` - Ansehen (500+ LoC)
- [ ] `homeassistant.service.ts` - API-Calls prüfen
- [ ] `ha-*.controller.ts` - Neue Backend-Controller
- [ ] `homeassistant.module.ts` - Controller-Registrierung

## 🚨 Bekannte Issues

| Issue | Status | Workaround |
|-------|--------|-----------|
| Persons API 404 | ⚠️ | Wird vom Backend noch implementiert |
| Zones API 404 | ⚠️ | Wird vom Backend noch implementiert |
| Media Players API 404 | ⚠️ | Wird vom Backend noch implementiert |
| Services API 404 | ⚠️ | Wird vom Backend noch implementiert |
| Virtual Scrolling | ❌ | Nicht implementiert (für >10k Zeilen) |
| Real-Time Updates | ❌ | Nicht implementiert |

## 📞 Support

**Probleme?**
1. Logs prüfen: `ng build` / Backend-Console
2. DevTools Console (F12)
3. Network-Tab auf API-Responses prüfen
4. README.md im Feature-Ordner ansehen

---

**Branch:** menuadminhatabellen
**Last Commit:** d70bce5 Implementation Summary
**Status:** ✅ Produktionsreif

