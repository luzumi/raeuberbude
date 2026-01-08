# Home Assistant Sync (Live + Devices/Areas) – konsolidiert

## Ziel
Eine schlanke Referenz für die Synchronisation von **Areas**, **Devices** und **Entities** nach **MariaDB (TypeORM)**.

Es gibt 2 Wege, die beide im Repo existieren:

- **Live-Sync (direkt aus Home Assistant)**: Backend ruft Daten aus HA-API ab und schreibt Upserts in MariaDB.
- **Dump → Import → Sync (Legacy/Bootstrap-Flow)**: Export per Script (inkl. WebSocket für Devices/Areas), Import (falls genutzt) und anschließender Sync.

## Voraussetzungen
- **Home Assistant Long-Lived Access Token**
- Backend `.env`:

```env
HA_URL=http://homeassistant.local:8123
HA_TOKEN=dein_token_hier
```

## Datenbank
Migration für strukturierte Tabellen ausführen:

```bash
cd backend/nest-app
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < db-migrations/0002_ha_live_sync_tables.sql
```

Tabellen/Beziehungen (Kurzform):

- `ha_areas` (1:n) `ha_devices`
- `ha_devices` (1:n) `ha_entities`
- `ha_entities` kann zusätzlich direkt `area_id` haben (wenn kein Device)

## Live-Sync verwenden (empfohlen)
### Verbindung testen

```bash
curl http://localhost:3000/api/ha/sync/test
```

### Sync starten

```bash
curl -X POST http://localhost:3000/api/ha/sync/all
```

Optional:

- `POST /api/ha/sync/areas`
- `POST /api/ha/sync/devices`
- `POST /api/ha/sync/entities`
- `GET  /api/ha/sync/domains`

Frontend:

- `http://localhost:4200/admin/homeassistant` → Tab „Synchronisation“

## Dump → Import → Sync (wenn du mit Export-Dateien arbeitest)
Problem/Grundlage (kurz): **Devices** sind über HA oft nur sauber über **WebSocket**-Registry abrufbar; deshalb nutzt der Dump WebSocket und fällt sonst auf REST zurück.

### Dump erstellen

```bash
npm run ha:dump
```

Benötigte env (für das Script):

```env
HA_BASE_URL=http://homeassistant.local:8123
HA_TOKEN=dein_token_hier
```

### Bootstrap/Import Verhalten (falls aktiv)

```env
HA_IMPORT_ON_START=always
HA_SYNC_AFTER_IMPORT=true
```

## MariaDB Query API (prüfen der Daten)
Beispiele:

- `GET /api/homeassistant/db/statistics`
- `GET /api/homeassistant/db/areas`
- `GET /api/homeassistant/db/devices`
- `GET /api/homeassistant/db/entities?domain=light`

## Implementierungs-Orte (nur die wichtigsten)
- Backend:
  - `backend/nest-app/src/modules/homeassistant/services/ha-live-sync.service.ts`
  - `backend/nest-app/src/modules/homeassistant/controllers/ha-live-sync.controller.ts`
  - `backend/nest-app/src/modules/homeassistant/services/ha-mariadb-query.service.ts`
  - `backend/nest-app/src/modules/homeassistant/controllers/ha-mariadb.controller.ts`
- Frontend:
  - `src/app/services/home-assistant/ha-sync.service.ts`
  - Admin-UI: `/admin/homeassistant`

## Troubleshooting (kurz)
- **401 Unauthorized**: Token prüfen/neu erstellen, keine Leerzeichen.
- **Keine Devices**:
  - Prüfen, ob HA überhaupt Devices hat (HA UI „Geräte“)
  - Bei Dump-Flow: sicherstellen, dass WebSocket-Teil im Dump funktioniert.

