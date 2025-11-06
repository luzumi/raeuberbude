# HomeAssistant Data Module (MongoDB)

## Übersicht

Dieses Modul speichert HomeAssistant-Daten in MongoDB (über Mongoose). Es ermöglicht den Import, die Speicherung und die Abfrage von HomeAssistant-Entitäten, Geräten, Bereichen und deren historischen Zuständen.

## Architektur

### Datenbankmodell (MongoDB Collections)

Das Modell nutzt ein flexibles EAV-Pattern (Entity-Attribute-Value) für maximale Erweiterbarkeit. Folgende Collections werden verwendet:

- **ha_snapshots**: Import-Snapshots mit Zeitstempel
- **ha_entities**: Zentrale Entitätstabelle (Sensoren, Schalter, Lichter, etc.)
- **ha_entity_states**: Historische Zustandsdaten
- **ha_entity_attributes**: Flexible Attributspeicherung
- **ha_devices**: Geräteinformationen
- **ha_areas**: Raum-/Bereichsdefinitionen
- **ha_persons**: Personen-spezifische Daten
- **ha_zones**: Zonen mit GPS-Koordinaten
- **ha_automations**: Automationen
- **ha_media_players**: Media Player
- **ha_services**: Service-Definitionen

### Services

1. **HaImportService**: Import von JSON-Daten mit Transaktionsunterstützung
2. **HaQueryService**: Umfangreiche Query-API für alle Entitätstypen

## Installation

### 1. Abhängigkeiten installieren

```bash
cd backend/nest-app
npm install
```

### 2. MongoDB starten

```bash
cd backend
docker-compose up -d mongo
```

### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env` Datei basierend auf `.env.example`:

Die Verbindung wird über `MONGO_URI` (oder Einzelteile via `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_AUTH_SOURCE`) konfiguriert. Siehe `backend/.env.example`.

## Verwendung

### Daten importieren

#### Via CLI (empfohlen)

```bash
cd backend/nest-app
npm run import:ha ../../ha_structure_2025-10-30T11-32-32.058Z.json
```

#### Via API

```bash
# File Upload
curl -X POST http://localhost:3001/api/homeassistant/import/file \
  -F "file=@ha_structure.json"

# JSON Body
curl -X POST http://localhost:3001/api/homeassistant/import/json \
  -H "Content-Type: application/json" \
  -d @ha_structure.json
```

### Daten abfragen

#### Alle Entitäten

```bash
curl http://localhost:3001/api/homeassistant/entities
```

#### Entitäten nach Typ filtern

```bash
curl http://localhost:3001/api/homeassistant/entities?type=sensor
```

#### Entität suchen

```bash
curl http://localhost:3001/api/homeassistant/entities/search?q=battery
```

#### Statistiken

```bash
curl http://localhost:3001/api/homeassistant/entities/statistics
```

#### Entitäts-Historie

```bash
curl http://localhost:3001/api/homeassistant/entities/sensor.pixel_8_pro_battery_level/history
```

## API-Dokumentation

Swagger UI ist verfügbar unter: http://localhost:3001/api

## Beispiele

### TypeScript/Angular Service

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HomeAssistantDataService {
  private apiUrl = 'http://localhost:3001/api/homeassistant';

  constructor(private http: HttpClient) {}

  getEntities(type?: string): Observable<any[]> {
    const url = type ? `${this.apiUrl}/entities?type=${type}` : `${this.apiUrl}/entities`;
    return this.http.get<any[]>(url);
  }

  searchEntities(searchTerm: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/entities/search?q=${searchTerm}`);
  }

  getEntityHistory(entityId: string, startDate?: Date, endDate?: Date): Observable<any[]> {
    let url = `${this.apiUrl}/entities/${entityId}/history`;
    if (startDate && endDate) {
      url += `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    }
    return this.http.get<any[]>(url);
  }

  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/entities/statistics`);
  }
}
```

### Erweiterte Queries

```typescript
// Alle aktiven Media Player
const activePlayers = await queryService.getActiveMediaPlayers();

// Personen in einer Zone
const personsInHome = await queryService.getPersonsInZone('home');

// Geräte in einem Bereich
const livingRoomDevices = await queryService.getDevicesByArea('living_room');

// Services nach Domain
const lightServices = await queryService.getServicesByDomain('light');
```

## Wartung

### Datenbank-Backup

```bash
docker exec -t $(docker ps -qf name=mongo) mongodump \
  -u rb_root -p rb_secret --authenticationDatabase admin \
  --db raueberbude --archive=/dump/ha_dump.archive
```

### Datenbank-Restore

```bash
docker exec -i $(docker ps -qf name=mongo) mongorestore \
  -u rb_root -p rb_secret --authenticationDatabase admin \
  --archive=/dump/ha_dump.archive --nsInclude=raueberbude.* --drop
```

## Troubleshooting

### Import schlägt fehl

1. Prüfe ob MongoDB läuft:
   ```bash
   docker ps | grep mongo
   ```

2. Prüfe die Mongo-Logs:
   ```bash
   docker logs $(docker ps -qf name=mongo)
   ```

3. Stelle sicher, dass die JSON-Datei valide ist:
   ```bash
   jq empty ha_structure.json
   ```

### Verbindungsprobleme

1. Prüfe die Umgebungsvariablen in `.env`
2. Stelle sicher, dass Port 5432 nicht belegt ist
3. Prüfe die Docker-Network-Konfiguration

## Performance-Optimierung

### Indizes

Wichtige Indizes werden automatisch erstellt:
- Entity Type Index
- Entity Domain Index
- State Timestamp Index
- Attribute Key Index

### Query-Optimierung

- Nutze Pagination für große Datenmengen
- Verwende spezifische Entity-Type-Filter
- Cache häufig abgefragte Statistiken

## Erweiterung

### Neue Entity-Typen hinzufügen

1. Erweitere das `EntityType` Enum in `ha-entity.entity.ts`
2. Erstelle ggf. eine spezialisierte Entity-Klasse
3. Erweitere `importSpecializedEntity()` in `ha-import.service.ts`
4. Füge Query-Methoden in `ha-query.service.ts` hinzu

### Custom Queries

Erweitere `HaQueryService` mit eigenen Query-Methoden:

```typescript
async getCustomQuery(): Promise<any> {
  return await this.entityRepository
    .createQueryBuilder('entity')
    .leftJoinAndSelect('entity.states', 'state')
    .where('state.state = :state', { state: 'on' })
    .andWhere('entity.entityType = :type', { type: EntityType.LIGHT })
    .getMany();
}
```

## Lizenz

MIT
