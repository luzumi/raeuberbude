# Home Assistant Live-Synchronisation - Anleitung

## 🎯 Zusammenfassung

Du hast jetzt eine **vollständige Live-Synchronisation** zwischen Home Assistant und deiner MariaDB implementiert! Die Daten werden nicht mehr nur aus JSON-Dateien importiert, sondern können direkt vom laufenden Home Assistant abgerufen werden.

## ✅ Was wurde implementiert?

### Backend (NestJS)

1. **HaLiveSyncService** (`backend/nest-app/src/modules/homeassistant/services/ha-live-sync.service.ts`)
   - Ruft Devices, Entities und Areas direkt von der Home Assistant REST API ab
   - Speichert sie in MariaDB (TypeORM)
   - Unterstützt vollständige Synchronisation oder einzelne Datentypen

2. **HaLiveSyncController** (`backend/nest-app/src/modules/homeassistant/controllers/ha-live-sync.controller.ts`)
   - REST API-Endpunkte für Synchronisation
   - Verbindungstest
   - Domain-Abfrage

3. **Datenbank-Migration** (`backend/nest-app/db-migrations/0002_ha_live_sync_tables.sql`)
   - Strukturierte Tabellen für Areas, Devices, Entities
   - Foreign Keys und Indizes

### Frontend (Angular)

1. **HaSyncService** (`src/app/services/home-assistant/ha-sync.service.ts`)
   - Angular Service für API-Aufrufe

2. **HaSyncComponent** (`src/app/components/ha-sync/ha-sync.component.ts`)
   - UI-Komponente mit Buttons für Synchronisation
   - Anzeige von Statistiken
   - Verbindungstest

3. **Integration in Admin-Panel**
   - Neuer Tab "Synchronisation" in `/admin/homeassistant`

## 🚀 Schritt-für-Schritt Setup

### 1. Home Assistant Token erstellen

1. Öffne Home Assistant: `http://homeassistant.local:8123`
2. Klicke auf dein **Profil** (unten links)
3. Scrolle zu **Sicherheit** → **Long-Lived Access Tokens**
4. Klicke **Token erstellen**
5. Name eingeben: `Räuberbude Backend`
6. **Token kopieren** (wird nur einmal angezeigt!)

### 2. Backend konfigurieren

Öffne `backend/nest-app/.env` und trage ein:

```env
# Home Assistant Live API
HA_URL=http://homeassistant.local:8123
HA_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...dein_token_hier
```

### 3. Datenbank-Migration ausführen

```bash
cd backend/nest-app

# Option 1: TypeORM Migration
npm run typeorm migration:run

# Option 2: Manuell (falls TypeORM Probleme macht)
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < db-migrations/0002_ha_live_sync_tables.sql
```

### 4. Backend starten

```bash
cd backend/nest-app
npm run start:dev
```

Warte bis du siehst:
```
[Nest] Application successfully started
```

### 5. Verbindung testen

Öffne deinen Browser oder verwende curl:

```bash
# Verbindungstest
curl http://localhost:3000/api/ha/sync/test

# Sollte zurückgeben:
# {"success":true,"version":"2025.10.4"}
```

### 6. Erste Synchronisation durchführen

#### Via Terminal (curl):

```bash
# Alle Daten synchronisieren
curl -X POST http://localhost:3000/api/ha/sync/all

# Nur Devices
curl -X POST http://localhost:3000/api/ha/sync/devices

# Nur Areas
curl -X POST http://localhost:3000/api/ha/sync/areas

# Nur Entities
curl -X POST http://localhost:3000/api/ha/sync/entities
```

#### Via Angular Frontend:

1. Starte das Frontend: `npm start`
2. Öffne: `http://localhost:4200/admin/homeassistant`
3. Klicke auf den Tab **"Synchronisation"**
4. Klicke auf **"🔄 Alle synchronisieren"**

### 7. Daten prüfen

Nach der Synchronisation kannst du die Daten in der Datenbank prüfen:

```bash
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude
```

```sql
-- Anzahl der synchronisierten Daten
SELECT COUNT(*) as areas FROM ha_areas;
SELECT COUNT(*) as devices FROM ha_devices;
SELECT COUNT(*) as entities FROM ha_entities;

-- Beispiel-Daten anzeigen
SELECT * FROM ha_devices LIMIT 5;
SELECT * FROM ha_entities WHERE domain = 'light' LIMIT 10;
```

## 📊 API-Endpunkte

Alle Endpunkte unter `http://localhost:3000/api/ha/sync`:

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/all` | Synchronisiert Areas, Devices und Entities |
| POST | `/areas` | Synchronisiert nur Areas |
| POST | `/devices` | Synchronisiert nur Devices |
| POST | `/entities` | Synchronisiert nur Entities |
| GET | `/test` | Testet die Verbindung zu Home Assistant |
| GET | `/domains` | Gibt alle Entity-Domains zurück (light, switch, etc.) |

### Beispiel-Response von `/all`:

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

## 🔍 Troubleshooting

### Problem: "401 Unauthorized"

**Lösung:**
- Prüfe ob `HA_TOKEN` in `.env` korrekt gesetzt ist
- Erstelle ein neues Token in Home Assistant
- Stelle sicher, dass keine Leerzeichen im Token sind

### Problem: "Cannot connect to Home Assistant"

**Lösung:**
- Prüfe ob Home Assistant erreichbar ist:
  ```bash
  curl http://homeassistant.local:8123/api/
  ```
- Ändere ggf. `HA_URL` in `.env` auf die IP-Adresse:
  ```env
  HA_URL=http://192.168.1.100:8123
  ```

### Problem: "Keine Devices werden synchronisiert"

**Lösung:**
- Öffne Home Assistant → **Einstellungen** → **Geräte & Dienste** → **Geräte**
- Wenn keine Devices vorhanden sind, musst du zuerst Integrationen einrichten
- Manche Entities haben kein Device (z.B. Template-Entities)

### Problem: "TypeORM Fehler bei Migration"

**Lösung:**
- Führe die SQL-Datei manuell aus:
  ```bash
  mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < backend/nest-app/db-migrations/0002_ha_live_sync_tables.sql
  ```

### Problem: "Entities zeigen 'null' als friendly_name"

**Lösung:**
- Manche Entities haben keinen friendly_name in der Registry
- Der Service versucht dann: `state.attributes.friendly_name` → `entity.name` → `entity.original_name`
- Du kannst den friendly_name in Home Assistant setzen: **Einstellungen** → **Geräte & Dienste** → **Entities**

## 🔄 Automatische Synchronisation

Um die Sync beim App-Start automatisch auszuführen, erweitere `ha-bootstrap.service.ts`:

```typescript
// backend/nest-app/src/modules/homeassistant/services/ha-bootstrap.service.ts

async onApplicationBootstrap(): Promise<void> {
  // ...existing code...
  
  // Neu: Live-Sync beim Start
  const liveSyncEnabled = this.config.get<boolean>('HA_LIVE_SYNC_ON_START');
  if (liveSyncEnabled) {
    this.logger.log('Starte Live-Sync mit Home Assistant...');
    const result = await this.liveSyncService.syncAll();
    this.logger.log(`Live-Sync abgeschlossen: ${result.devices} Devices, ${result.entities} Entities`);
  }
}
```

In `.env` hinzufügen:
```env
HA_LIVE_SYNC_ON_START=true
```

## 🎨 Frontend-Verwendung

Die Sync-Komponente ist jetzt unter **Admin → Home Assistant → Synchronisation** verfügbar.

Du kannst sie auch in anderen Komponenten verwenden:

```typescript
import { HaSyncService } from '@services/home-assistant/ha-sync.service';

constructor(private syncService: HaSyncService) {}

syncData() {
  this.syncService.syncAll().subscribe(result => {
    console.log('Sync completed:', result);
  });
}
```

## 📝 Nächste Schritte

- [ ] **WebSocket-Integration**: Echtzeit-Updates bei Änderungen in Home Assistant
- [ ] **Scheduler**: Automatische Synchronisation alle X Minuten
- [ ] **Webhook**: Home Assistant benachrichtigt Backend bei Änderungen
- [ ] **Delta-Sync**: Nur geänderte Daten synchronisieren statt alles
- [ ] **Conflict-Resolution**: Was passiert bei Konflikten zwischen Mongo und HA?

## 🎉 Fertig!

Du hast jetzt eine vollständige Live-Synchronisation zwischen Home Assistant und deiner MariaDB!

**Test:**
1. Backend starten: `cd backend/nest-app && npm run start:dev`
2. Frontend starten: `npm start`
3. Öffne: `http://localhost:4200/admin/homeassistant`
4. Klicke auf Tab **"Synchronisation"**
5. Klicke **"🔄 Alle synchronisieren"**
6. Warte 5-10 Sekunden
7. Sieh die synchronisierten Daten in den anderen Tabs!

Bei Fragen oder Problemen, siehe **Troubleshooting** oben.

