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

