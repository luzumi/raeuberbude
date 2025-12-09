# Home Assistant Devices & Areas Synchronisation - Implementierung

## Zusammenfassung

Ich habe die fehlende Device- und Area-Synchronisation von Home Assistant nach MariaDB implementiert.

## Problem

In Ihrer MariaDB waren keine Devices vorhanden, obwohl die Entities synchronisiert wurden. Das lag daran, dass:

1. **Der HA-Dump keine Devices exportierte**: Der `ha_dump.js` Script konnte nur Entities abrufen, da Devices in Home Assistant nur über die WebSocket-API verfügbar sind, nicht über die REST-API
2. **Der Sync-Service nur Entities synchronisierte**: Der `HaSyncService` hatte keine Methoden für Device- und Area-Synchronisation
3. **Keine Device-Query-API für MariaDB**: Es gab keinen Service zum Abfragen von Devices aus MariaDB

## Implementierte Änderungen

### 1. Erweiterter HA-Dump Script (`.specify/scripts/ha_dump.js`)

**Was wurde geändert:**
- Hinzufügen von WebSocket-Unterstützung zum Abrufen von Devices und Areas
- Verwendung der Home Assistant WebSocket-API: `config/area_registry/list` und `config/device_registry/list`
- Fallback auf REST-API, falls WebSocket fehlschlägt
- Benötigt das `ws` npm-Paket (bereits installiert)

**Verwendung:**
```bash
# Von der Projekt-Root aus:
npm run ha:dump

# Oder mit expliziten Parametern:
HA_BASE_URL=http://homeassistant.local:8123 HA_TOKEN=your_token node .specify/scripts/ha_dump.js
```

### 2. Erweiterter Sync-Service (`backend/nest-app/src/modules/homeassistant/services/ha-sync.service.ts`)

**Neue Methoden:**
- `syncDevices(batchSize)`: Synchronisiert Devices von MongoDB zu MariaDB
- `syncAreas(batchSize)`: Synchronisiert Areas von MongoDB zu MariaDB  
- `syncAll(batchSize)`: Synchronisiert Areas, Devices und Entities in der richtigen Reihenfolge

**Verwendung im Code:**
```typescript
// Nur Devices synchronisieren
await haSyncService.syncDevices();

// Nur Areas synchronisieren
await haSyncService.syncAreas();

// Alles synchronisieren (empfohlen)
const result = await haSyncService.syncAll();
console.log(`Synced: ${result.areas.upserted} areas, ${result.devices.upserted} devices, ${result.entities.upserted} entities`);
```

### 3. Neuer MariaDB-Query-Service (`backend/nest-app/src/modules/homeassistant/services/ha-mariadb-query.service.ts`)

**Bereitgestellte Methoden:**
- `getAllEntities(domain?)`: Alle Entities, optional gefiltert nach Domain
- `getEntityById(entityId)`: Einzelne Entity
- `searchEntities(searchTerm)`: Suche in Entities
- `getAllDevices()`: Alle Devices
- `getDeviceById(deviceId)`: Einzelnes Device
- `getDeviceWithEntities(deviceId)`: Device mit allen zugehörigen Entities
- `getAllAreas()`: Alle Areas
- `getAreaById(areaId)`: Einzelne Area
- `getAreaWithDevicesAndEntities(areaId)`: Area mit Devices und Entities
- `getEntitiesByArea(areaId)`: Entities in einer Area
- `getEntitiesByDevice(deviceId)`: Entities eines Devices
- `getStatistics()`: Statistiken über Entities, Devices und Areas

### 4. Neuer MariaDB-Controller (`backend/nest-app/src/modules/homeassistant/controllers/ha-mariadb.controller.ts`)

**REST-API-Endpunkte:**

#### Entities
- `GET /api/homeassistant/db/entities?domain=light` - Alle Entities (optional gefiltert)
- `GET /api/homeassistant/db/entities/search?q=battery` - Entities suchen
- `GET /api/homeassistant/db/entities/:entityId` - Einzelne Entity

#### Devices
- `GET /api/homeassistant/db/devices` - Alle Devices
- `GET /api/homeassistant/db/devices/:deviceId` - Device mit Entities

#### Areas
- `GET /api/homeassistant/db/areas` - Alle Areas
- `GET /api/homeassistant/db/areas/:areaId` - Area mit Devices und Entities
- `GET /api/homeassistant/db/areas/:areaId/entities` - Entities in Area
- `GET /api/homeassistant/db/areas/:areaId/devices` - Devices in Area

#### Statistics
- `GET /api/homeassistant/db/statistics` - Statistiken

### 5. Aktualisierter Bootstrap-Service

Der Bootstrap-Service (`ha-bootstrap.service.ts`) wurde aktualisiert, um automatisch alle Daten (Areas, Devices, Entities) zu synchronisieren, wenn die Anwendung startet.

### 6. Korrigierte npm-Scripts

**Root package.json:**
```json
"start:network": "npx concurrently \"cd backend/nest-app && npm run start:dev\" \"cd .specify/mcp-servers && npm run all\" \"npx ng serve --host=0.0.0.0 --port=4301 --configuration=network --proxy-config=proxy.conf.json\""
```

**Neue Scripts:**
```json
"ha:dump": "node .specify/scripts/ha_dump.js",
"ha:sync": "cd backend/nest-app && npm run import:ha && npm run sync:ha"
```

## Workflow

### Erstmaliges Setup oder Daten-Refresh:

1. **Home Assistant Daten exportieren:**
   ```bash
   npm run ha:dump
   ```
   Dies erstellt eine Datei `ha_structure_[timestamp].json` mit Entities, Devices und Areas.

2. **Anwendung starten:**
   ```bash
   npm run start:network
   ```
   
   Der Bootstrap-Service wird automatisch:
   - Die JSON-Datei importieren (in MongoDB)
   - Alle Daten nach MariaDB synchronisieren (Areas → Devices → Entities)

3. **Daten abfragen:**
   - MongoDB-basierte API: `http://localhost:3001/api/homeassistant/entities`
   - MariaDB-basierte API: `http://localhost:3001/api/homeassistant/db/entities`

### Manuelle Synchronisation:

Falls Sie manuell synchronisieren möchten:

```bash
# Im Backend-Verzeichnis
cd backend/nest-app

# Nur Entities synchronisieren
npm run sync:entities

# Oder: Alles synchronisieren (wenn Script vorhanden)
npm run sync:ha
```

## Datenbeziehungen

```
Areas
  ├── Devices (via area_id)
  │   └── Entities (via device_id)
  └── Entities (direkt via area_id, wenn kein Device)
```

**MariaDB-Tabellen:**
- `ha_areas`: Areas (Räume/Bereiche)
- `ha_devices`: Devices (Geräte)
- `ha_entities`: Entities (Sensoren, Schalter, Lichter, etc.)

**Beziehungen:**
- `ha_devices.area_id` → `ha_areas.area_id`
- `ha_entities.device_id` → `ha_devices.device_id`
- `ha_entities.area_id` → `ha_areas.area_id`

## Umgebungsvariablen

Für den HA-Dump benötigen Sie:

```env
HA_BASE_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token
```

Für den Bootstrap-Import:

```env
HA_IMPORT_ON_START=always  # oder 'if_empty' oder 'never'
HA_IMPORT_FILE=./ha_structure_[timestamp].json  # optional
HA_SYNC_AFTER_IMPORT=true  # Sync nach Import aktivieren
```

## Testen

### 1. Devices aus MariaDB abfragen:
```bash
curl http://localhost:3001/api/homeassistant/db/devices
```

### 2. Devices mit ihren Entities:
```bash
curl http://localhost:3001/api/homeassistant/db/devices/your_device_id
```

### 3. Areas mit Devices und Entities:
```bash
curl http://localhost:3001/api/homeassistant/db/areas/your_area_id
```

### 4. Statistiken:
```bash
curl http://localhost:3001/api/homeassistant/db/statistics
```

## Troubleshooting

### "No devices in MariaDB"

1. Prüfen Sie, ob Devices im JSON-Dump vorhanden sind:
   ```bash
   grep -c '"devices"' ha_structure_*.json
   ```

2. Prüfen Sie MongoDB:
   ```bash
   docker exec -it mongodb mongosh raeuberbude --eval "db.ha_devices.count()"
   ```

3. Manuell synchronisieren:
   ```bash
   cd backend/nest-app
   npm run sync:ha
   ```

### "WebSocket connection failed in ha_dump.js"

Fallback auf REST-API sollte automatisch funktionieren. Prüfen Sie:
- Home Assistant erreichbar: `curl http://homeassistant.local:8123/api/`
- Token gültig: Prüfen Sie in Home Assistant → Profile → Long-Lived Access Tokens

### "npm prefix path error"

Stellen Sie sicher, dass Sie das Script aus der **Projekt-Root** ausführen:
```bash
cd C:\Users\corat\IdeaProjects\raueberbude
npm run start:network
```

## Nächste Schritte

1. **Live-Sync implementieren**: Echtzeit-Updates von Home Assistant über WebSocket
2. **Frontend-Integration**: Devices und Areas in der Admin-Oberfläche anzeigen
3. **Device-Management**: Devices verwalten (umbenennen, Areas zuweisen, etc.)
4. **Automatisierung**: Devices in Sprachbefehlen verwenden

## Dateien

- `.specify/scripts/ha_dump.js` - Erweiterter Export-Script
- `backend/nest-app/src/modules/homeassistant/services/ha-sync.service.ts` - Sync-Service
- `backend/nest-app/src/modules/homeassistant/services/ha-mariadb-query.service.ts` - Query-Service
- `backend/nest-app/src/modules/homeassistant/controllers/ha-mariadb.controller.ts` - REST-Controller
- `backend/nest-app/src/modules/homeassistant/services/ha-bootstrap.service.ts` - Bootstrap-Service
- `backend/nest-app/src/modules/homeassistant/homeassistant.module.ts` - Modul-Konfiguration
- `package.json` (Root) - npm-Scripts
- `backend/nest-app/package.json` - Backend-Scripts

## Status

✅ Device-Export über WebSocket implementiert
✅ Device-Synchronisation MongoDB → MariaDB implementiert
✅ Area-Synchronisation MongoDB → MariaDB implementiert
✅ MariaDB-Query-Service implementiert
✅ REST-API für Devices/Areas implementiert
✅ Bootstrap-Service aktualisiert
✅ npm-Scripts korrigiert

🔄 Noch zu testen: Vollständiger Workflow (Dump → Import → Sync)
🔄 Frontend-Integration steht noch aus

