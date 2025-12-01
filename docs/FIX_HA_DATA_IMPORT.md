# Fix: Home Assistant Daten Import/Re-Import

## Problem

Die MongoDB Collections für Home Assistant waren nicht korrekt gefüllt:
- `ha_areas` war leer (keine Areas)
- `ha_entities` hatte 343 Entitäten, wurden aber nicht korrekt abgerufen
- Dialog zeigte keine Areas oder Entities zur Auswahl

## Root Cause

Der Bootstrap-Import beim Server-Start hatte entweder:
1. Nicht korrekt funktioniert
2. Veraltete Daten geladen
3. War auf `never` gesetzt oder keine Datei gefunden

## Lösung

### 1. Backend: Re-Import Endpunkt

**Neue API:** `POST /api/homeassistant/import/reimport`

Ermöglicht manuelles Neu-Importieren der Home Assistant Struktur aus der konfigurierten Datei.

**Datei:** `backend/nest-app/src/modules/homeassistant/controllers/ha-import.controller.ts`

```typescript
@Post('reimport')
async reimport(@Body() body: { filePath?: string }): Promise<HaSnapshot> {
  const filePath = body?.filePath || this.findDefaultImportFile();
  
  if (!filePath) {
    throw new Error('No import file found');
  }
  
  return await this.importService.importFromFile(filePath);
}
```

**Features:**
- Sucht automatisch nach `ha_structure_*.json` im Repo
- Optional: Eigener Pfad über Request Body
- Gibt Snapshot-Statistiken zurück

### 2. Frontend: Re-Import Button

**Datei:** `src/app/features/admin/areas/admin-areas.component.ts`

**Neue Features:**
- "HA Daten neu importieren" Button mit Accent-Farbe
- Loading-State während Import (`isImporting`)
- Confirmation Dialog vor Import
- Success/Error Snackbar mit Statistiken
- Empty State wenn keine Areas vorhanden

**UI-Flow:**
1. Admin öffnet Areas-Seite
2. Sieht leere Liste + Warning
3. Klickt "HA Daten neu importieren"
4. Bestätigt Dialog
5. Import läuft (Button disabled)
6. Success-Message mit Stats
7. Areas werden neu geladen

### 3. Dialog: Bessere Error Handling

**Dateien:**
- `admin-transcript-edit-dialog.component.html`
- `admin-transcript-edit-dialog.component.scss`

**Neue Warning-Boxen:**
```html
<div class="warning-box" *ngIf="areas.length === 0">
  <mat-icon>warning</mat-icon>
  <div class="warning-content">
    <p><strong>Keine Areas gefunden!</strong></p>
    <p>Bitte importieren Sie die HA Daten im 
       <a href="/admin/areas">Areas Admin-Bereich</a>.
    </p>
  </div>
</div>
```

**Anzeige wenn:**
- Keine Areas geladen
- Keine Entities geladen (und keine Suche aktiv)

**Design:**
- Gelber Warning-Stil (#fff3cd background)
- Icon + Content Layout
- Link zum Areas-Admin
- Klare Handlungsanweisung

## Verwendung

### Schritt 1: Areas Admin öffnen
```
http://localhost:4200/admin/areas
```

### Schritt 2: Re-Import triggern
1. Klick auf "HA Daten neu importieren" Button
2. Bestätige Dialog
3. Warte auf Erfolgs-Meldung

### Schritt 3: Transcript Dialog öffnen
1. Navigiere zu Speech Assistant Admin
2. Öffne Transcript Details
3. ✅ Areas und Entities werden jetzt angezeigt!

## API-Details

### POST /api/homeassistant/import/reimport

**Request:**
```json
{
  "filePath": "/path/to/ha_structure.json" // optional
}
```

**Response:**
```json
{
  "_id": "snapshot_id",
  "timestamp": "2025-11-26T...",
  "status": "completed",
  "stats": {
    "areas": 12,
    "devices": 45,
    "entities": 343,
    "services": 89
  }
}
```

**Fehler-Szenarien:**
- 400: Keine Datei gefunden
- 500: Import fehlgeschlagen

### Automatischer Import beim Start

**Environment Variables:**
```bash
HA_IMPORT_ON_START=always    # never | if_empty | always
HA_IMPORT_FILE=/path/to/file.json
HA_IMPORT_FAIL_ON_ERROR=false
```

**Default:**
- Sucht nach `ha_structure_*.json` in:
  - CWD (process.cwd())
  - Parent directories (bis 3 Ebenen hoch)
- Mode: `always`
- Fail on error: `false`

## Datei-Struktur

**Erwartetes Format:** `ha_structure_*.json`

```json
{
  "timestamp": "2025-11-26T...",
  "home_assistant_version": "2024.11.3",
  "areas": [
    {
      "area_id": "wohnzimmer",
      "name": "Wohnzimmer",
      "aliases": ["living_room"],
      "floor": "eg",
      "icon": "mdi:sofa"
    }
  ],
  "devices": [...],
  "entities": {
    "light.wohnzimmer_decke": {
      "entity_id": "light.wohnzimmer_decke",
      "state": "on",
      "attributes": {
        "friendly_name": "Wohnzimmer Deckenlampe",
        "supported_features": 17,
        "brightness": 255
      }
    }
  },
  "services": {...}
}
```

## Geänderte Dateien

### Backend
1. **ha-import.controller.ts** (+35 Zeilen)
   - `reimport()` Endpunkt
   - `findDefaultImportFile()` Helper

### Frontend
2. **admin-areas.component.ts** (+40 Zeilen)
   - `reimport()` Methode
   - `isImporting` State
   - Re-Import Button
   - Empty State Warning

3. **admin-transcript-edit-dialog.component.html** (+20 Zeilen)
   - Warning-Box für Areas
   - Warning-Box für Entities

4. **admin-transcript-edit-dialog.component.scss** (+55 Zeilen)
   - `.warning-box` Styling
   - Responsive Layout

## Testing

### 1. Backend-Test
```bash
curl -X POST http://localhost:3001/api/homeassistant/import/reimport \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Frontend-Test
```bash
cd C:\Users\corat\IdeaProjects\raueberbude
npm run start

# Browser:
http://localhost:4200/admin/areas
# Klick "HA Daten neu importieren"
```

### 3. Transcript Dialog Test
```
http://localhost:4200/admin/speech-assistant?tab=2
# Klick auf Auge-Icon bei Transkript
# → Sollte Areas + Entities anzeigen
```

## Monitoring

**Snapshots prüfen:**
```
GET /api/homeassistant/import/snapshots
```

**Letzten Import prüfen:**
```javascript
db.hasnapshots.find().sort({ importDate: -1 }).limit(1)
```

**Areas zählen:**
```javascript
db.ha_areas.countDocuments()
```

**Entities zählen:**
```javascript
db.ha_entities.countDocuments()
```

## Troubleshooting

### Problem: "No import file found"
**Lösung:**
1. Prüfe ob `ha_structure_*.json` im Repo existiert
2. Setze `HA_IMPORT_FILE` Environment Variable
3. Oder gib expliziten Pfad im Request an

### Problem: Import schlägt fehl
**Lösung:**
1. Prüfe Logs: `backend/nest-app/logs/`
2. Validiere JSON-Struktur
3. Prüfe MongoDB-Connection
4. Checke Disk Space

### Problem: Areas/Entities noch leer nach Import
**Lösung:**
1. Prüfe Snapshot Status: GET `/api/homeassistant/import/snapshots`
2. Status sollte "completed" sein
3. Falls "failed": Checke errorLog
4. Re-Import mit F5 refresh triggern

### Problem: Alte Daten werden nicht überschrieben
**Lösung:**
- Import verwendet `updateOne` mit `upsert: true`
- Alte Daten werden automatisch ersetzt
- Bei Problemen: MongoDB Collections manuell leeren

## Build Status

✅ Backend kompiliert erfolgreich  
✅ Frontend kompiliert erfolgreich  
✅ API-Endpunkt funktioniert  
✅ UI-Integration abgeschlossen  
⚠️  Budget-Warnings (nicht kritisch)

## Next Steps (Optional)

1. **Live-Sync**: WebSocket-Verbindung zu Home Assistant für Echtzeit-Updates
2. **Incremental Import**: Nur geänderte Entities updaten
3. **Scheduled Import**: Cron-Job für automatischen Re-Import
4. **Validation**: Pre-Import Schema-Validierung
5. **Backup**: Snapshot-Rollback-Funktion

---

🎉 **Home Assistant Daten können jetzt jederzeit manuell neu importiert werden!**

