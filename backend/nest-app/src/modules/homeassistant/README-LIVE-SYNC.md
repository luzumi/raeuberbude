# Home Assistant Live Sync

## Übersicht

Die **Live Sync**-Funktionalität synchronisiert Devices, Entities und Areas direkt von deinem Home Assistant in die MariaDB, sodass du nicht mehr auf JSON-Exporte angewiesen bist.

## Setup

### 1. Long-Lived Access Token erstellen

1. Öffne Home Assistant: `http://homeassistant.local:8123`
2. Navigiere zu: **Profil** → **Sicherheit** (ganz unten)
3. Scrolle zu **Long-Lived Access Tokens**
4. Klicke auf **Token erstellen**
5. Gib einen Namen ein (z.B. "Räuberbude Backend")
6. Kopiere das generierte Token (wird nur einmal angezeigt!)

### 2. Token in .env eintragen

Öffne `backend/nest-app/.env` und trage das Token ein:

```env
HA_URL=http://homeassistant.local:8123
HA_TOKEN=dein_generiertes_token_hier
```

### 3. Datenbank-Migration ausführen

```bash
cd backend/nest-app
npm run typeorm migration:run
```

Oder manuell die SQL-Datei ausführen:

```bash
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < db-migrations/0002_ha_live_sync_tables.sql
```

## Verwendung

### Backend API-Endpunkte

Nach dem Start des Backends (`npm run start:dev`) sind folgende Endpunkte verfügbar:

#### Vollständige Synchronisation
```http
POST http://localhost:3000/api/ha/sync/all
```

Synchronisiert Areas, Devices und Entities in einem Durchgang.

**Response:**
```json
{
  "success": true,
  "message": "Synchronisation erfolgreich",
  "data": {
    "areas": 12,
    "devices": 45,
    "entities": 234
  }
}
```

#### Einzelne Synchronisationen

```http
POST http://localhost:3000/api/ha/sync/areas
POST http://localhost:3000/api/ha/sync/devices
POST http://localhost:3000/api/ha/sync/entities
```

#### Verbindungstest

```http
GET http://localhost:3000/api/ha/sync/test
```

Testet die Verbindung zu Home Assistant:

```json
{
  "success": true,
  "version": "2025.10.4"
}
```

#### Verfügbare Entity-Domains abrufen

```http
GET http://localhost:3000/api/ha/sync/domains
```

Gibt alle verfügbaren Entity-Domains zurück (light, switch, sensor, etc.):

```json
{
  "success": true,
  "domains": ["light", "switch", "sensor", "climate", ...],
  "count": 25
}
```

## Automatische Synchronisation beim Start

Du kannst die Live-Sync auch beim App-Start automatisch ausführen lassen. Füge dazu in `backend/nest-app/.env` hinzu:

```env
HA_LIVE_SYNC_ON_START=true
```

Und erweitere `ha-bootstrap.service.ts`:

```typescript
if (this.config.get<boolean>('HA_LIVE_SYNC_ON_START')) {
  await this.liveSyncService.syncAll();
}
```

## Datenbank-Struktur

### Tabelle: ha_areas

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | CHAR(36) | UUID (Primary Key) |
| area_id | VARCHAR(255) | HA Area ID (Natural Key, UNIQUE) |
| name | VARCHAR(255) | Area Name (z.B. "Wohnzimmer") |
| aliases | JSON | Alternative Namen |
| floor | VARCHAR(100) | Etage |
| icon | VARCHAR(100) | Icon-Name |

### Tabelle: ha_devices

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | CHAR(36) | UUID (Primary Key) |
| device_id | VARCHAR(255) | HA Device ID (Natural Key, UNIQUE) |
| name | VARCHAR(255) | Device Name |
| manufacturer | VARCHAR(255) | Hersteller |
| model | VARCHAR(255) | Modell |
| sw_version | VARCHAR(100) | Software-Version |
| area_id | VARCHAR(255) | Foreign Key → ha_areas.area_id |
| via_device_id | VARCHAR(255) | Parent Device (Self-Reference) |

**Beziehungen:**
- `area_id` → `ha_areas.area_id` (ON DELETE SET NULL)
- `via_device_id` → `ha_devices.device_id` (Self-Reference, ON DELETE SET NULL)

### Tabelle: ha_entities

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | CHAR(36) | UUID (Primary Key) |
| entity_id | VARCHAR(255) | Entity ID (z.B. "light.wohnzimmer_decke") |
| friendly_name | VARCHAR(255) | Anzeigename |
| domain | VARCHAR(100) | Domain (light, switch, sensor, ...) |
| platform | VARCHAR(100) | Integration (z.B. "mqtt", "zigbee2mqtt") |
| device_id | VARCHAR(36) | Foreign Key → ha_devices.id |
| area_id | VARCHAR(36) | Foreign Key → ha_areas.id |
| device_class | VARCHAR(100) | Device Class (temperature, humidity, ...) |
| capabilities | JSON | Entity Capabilities (Attributes aus HA) |

## Troubleshooting

### Fehler: 401 Unauthorized

→ Token ist ungültig oder nicht gesetzt. Prüfe `HA_TOKEN` in `.env`

### Fehler: Cannot connect to Home Assistant

→ Prüfe ob Home Assistant erreichbar ist:
```bash
curl http://homeassistant.local:8123/api/
```

→ Prüfe `HA_URL` in `.env`

### Keine Devices werden synchronisiert

→ Stelle sicher, dass in Home Assistant Devices registriert sind:
- Öffne Home Assistant
- Navigiere zu **Einstellungen** → **Geräte & Dienste** → **Geräte**
- Wenn keine Devices vorhanden sind, müssen zuerst Integrationen eingerichtet werden

## Nächste Schritte

- [ ] Webhook für automatische Updates von Home Assistant implementieren
- [ ] WebSocket-Verbindung für Echtzeit-Updates
- [ ] Scheduler für regelmäßige Synchronisation (z.B. alle 5 Minuten)
- [ ] Angular-Service für Frontend-Integration

