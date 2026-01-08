# HomeAssistant Binding System

## Übersicht

Das Binding-System ermöglicht die Verknüpfung von HomeAssistant-Entitäten mit:
- **Users** → Devices (z.B. Pixel 8 Pro → Max Mustermann)
- **Devices** → Entities (z.B. Battery-Sensor → Pixel 8 Pro)
- **Devices** → Areas (z.B. LG Fernseher → Wohnzimmer)

## Architektur

### Entities

#### 1. UserDeviceBinding
Verknüpft App-User mit HomeAssistant-Geräten.

**Features:**
- Ein User kann mehrere Devices haben
- Ein Device kann mehreren Users gehören
- Primary-Device Markierung für Push-Notifications
- Custom-Alias (z.B. "Mein Handy" statt "Pixel 8 Pro")
- Metadata für zusätzliche Infos

**Beispiel:**
```typescript
{
  userId: "user-uuid",
  haDeviceId: "device-uuid",
  customAlias: "Mein Handy",
  isPrimary: true,
  metadata: { notificationsEnabled: true }
}
```

#### 2. DeviceEntityBinding
Verknüpft Entities explizit mit Devices.

**Features:**
- Automatisch (aus HA übernommen) oder Manuell
- Custom-Kategorien (z.B. "Battery Sensors", "Location", "Controls")
- Display-Order für UI-Sortierung
- Visibility-Toggle zum Ausblenden irrelevanter Entities
- Suggestion-Status

**Beispiel:**
```typescript
{
  haDeviceId: "device-uuid",
  haEntityId: "sensor.pixel_8_pro_battery",
  bindingType: "manual",
  customCategory: "Battery Sensors",
  displayOrder: 1,
  isVisible: true
}
```

#### 3. DeviceAreaBinding
Verknüpft Devices mit Areas/Räumen.

**Features:**
- Multi-Area Support (Device in mehreren Räumen)
- Primary-Area Markierung
- Temporäre Zuordnungen mit Gültigkeitsdauer
- Auto-Cleanup für abgelaufene Bindings

**Beispiel:**
```typescript
{
  haDeviceId: "device-uuid",
  haAreaId: "area-uuid",
  isPrimary: true,
  isTemporary: false,
  validFrom: null,
  validUntil: null
}
```

## REST API Endpoints

### User-Device Bindings

#### Erstellen
```http
POST /api/bindings/user-device
Content-Type: application/json

{
  "userId": "user-uuid",
  "haDeviceId": "device-uuid",
  "customAlias": "Mein Handy",
  "isPrimary": true
}
```

#### Alle Bindings eines Users
```http
GET /api/bindings/user-device/user/:userId
```

#### Primäres Device eines Users
```http
GET /api/bindings/user-device/user/:userId/primary
```

#### Suggestions für User
```http
GET /api/bindings/user-device/user/:userId/suggestions
```

#### Aktualisieren
```http
PUT /api/bindings/user-device/:id
Content-Type: application/json

{
  "customAlias": "Neuer Name",
  "isPrimary": false
}
```

#### Löschen
```http
DELETE /api/bindings/user-device/:id
```

---

### Device-Entity Bindings

#### Erstellen
```http
POST /api/bindings/device-entity
Content-Type: application/json

{
  "haDeviceId": "device-uuid",
  "haEntityId": "sensor.pixel_8_pro_battery",
  "bindingType": "manual",
  "customCategory": "Battery Sensors",
  "displayOrder": 1,
  "isVisible": true
}
```

#### Alle Entity-Bindings eines Devices
```http
GET /api/bindings/device-entity/device/:deviceId
```

#### Bindings nach Kategorie
```http
GET /api/bindings/device-entity/device/:deviceId/category/:category
```

#### Auto-Sync aus HA
```http
POST /api/bindings/device-entity/sync-auto
```

**Response:**
```json
{
  "created": 42,
  "skipped": 13
}
```

#### Filter-Preset anwenden
```http
POST /api/bindings/device-entity/device/:deviceId/apply-preset
Content-Type: application/json

{
  "preset": "battery_only"
}
```

**Verfügbare Presets:**
- `all_sensors`: Alle Sensoren (sensor, binary_sensor)
- `battery_only`: Nur Battery-Sensoren
- `controls_only`: Nur Controls (switch, button, light, etc.)
- `location_only`: Nur Location (device_tracker)

#### Suggestions für Device
```http
GET /api/bindings/device-entity/device/:deviceId/suggestions
```

---

### Device-Area Bindings

#### Erstellen
```http
POST /api/bindings/device-area
Content-Type: application/json

{
  "haDeviceId": "device-uuid",
  "haAreaId": "area-uuid",
  "isPrimary": true,
  "isTemporary": false
}
```

#### Temporäre Zuordnung
```http
POST /api/bindings/device-area
Content-Type: application/json

{
  "haDeviceId": "device-uuid",
  "haAreaId": "area-uuid",
  "isPrimary": false,
  "isTemporary": true,
  "validFrom": "2025-12-16T10:00:00Z",
  "validUntil": "2025-12-16T18:00:00Z"
}
```

#### Alle Area-Bindings eines Devices
```http
GET /api/bindings/device-area/device/:deviceId
```

#### Primäre Area eines Devices
```http
GET /api/bindings/device-area/device/:deviceId/primary
```

#### Aktive Bindings (nicht abgelaufen)
```http
GET /api/bindings/device-area/device/:deviceId/active
```

#### Cleanup abgelaufener Bindings
```http
POST /api/bindings/device-area/cleanup-expired
```

**Response:**
```json
{
  "deletedCount": 5
}
```

---

## Use Cases

### 1. User-Device Binding: Mobile App User

Ein User registriert sein Smartphone in der App:

```typescript
// 1. User registriert sich
POST /api/auth/register
{ username: "max", email: "max@example.com", password: "..." }

// 2. Finde das Pixel 8 Pro Device in HA
GET /api/ha/devices?search=pixel

// 3. Binde das Device an den User
POST /api/bindings/user-device
{
  userId: "max-uuid",
  haDeviceId: "pixel-uuid",
  customAlias: "Mein Pixel",
  isPrimary: true
}

// 4. Hole alle Devices des Users
GET /api/bindings/user-device/user/max-uuid
```

### 2. Device-Entity Binding: Battery Monitoring

Zeige alle Battery-Sensoren eines Geräts:

```typescript
// 1. Wende Battery-Preset an
POST /api/bindings/device-entity/device/pixel-uuid/apply-preset
{ preset: "battery_only" }

// 2. Hole alle Battery-Bindings
GET /api/bindings/device-entity/device/pixel-uuid/category/battery_only

// 3. Response
[
  {
    haEntityId: "sensor.pixel_8_pro_battery_level",
    customCategory: "battery_only",
    displayOrder: 0,
    isVisible: true
  },
  {
    haEntityId: "sensor.pixel_8_pro_battery_state",
    customCategory: "battery_only",
    displayOrder: 1,
    isVisible: true
  }
]
```

### 3. Device-Area Binding: Smart Home Automation

Fernsehen im Wohnzimmer, Lampe in der Küche:

```typescript
// 1. Binde LG TV an Wohnzimmer
POST /api/bindings/device-area
{
  haDeviceId: "lg-tv-uuid",
  haAreaId: "wohnzimmer-uuid",
  isPrimary: true
}

// 2. Binde Lampe an Küche
POST /api/bindings/device-area
{
  haDeviceId: "lampe-xy-uuid",
  haAreaId: "kueche-uuid",
  isPrimary: true
}

// 3. Hole alle Devices im Wohnzimmer
GET /api/bindings/device-area/area/wohnzimmer-uuid
```

### 4. Suggestion-System: Bulk-Import

Importiere alle HA-Bindings automatisch:

```typescript
// 1. Sync Auto-Bindings aus HA
POST /api/bindings/device-entity/sync-auto
// Response: { created: 42, skipped: 13 }

// 2. Hole Suggestions für einen User
GET /api/bindings/user-device/user/max-uuid/suggestions
// Response: [{ haDeviceId: "pixel-uuid", confidence: 0.95 }]

// 3. Hole Suggestions für ein Device
GET /api/bindings/device-entity/device/pixel-uuid/suggestions
// Response: [{ haEntityId: "sensor.pixel_location", confidence: 0.89 }]
```

---

## Migration

### Schritt 1: Datenbank-Migration ausführen

```bash
# MariaDB
mysql -u root -p raeuberbude < migrations/20251216-create-binding-tables.sql

# Oder über TypeORM (wenn konfiguriert)
npm run typeorm migration:run
```

### Schritt 2: Backend starten

```bash
cd backend/nest-app
npm install
npm run start:dev
```

### Schritt 3: Test-Daten einfügen

```bash
# Optional: Test-Script ausführen
node scripts/seed-bindings.js
```

---

## Frontend Integration

### Edit-Dialog Beispiel

```typescript
// User-Device Binding Dialog
import { BindingsService } from '@app/core/services/bindings.service';

export class UserDeviceEditDialog {
  constructor(private bindingsService: BindingsService) {}

  async loadBindings(userId: string) {
    const bindings = await this.bindingsService.getUserDeviceBindings(userId);
    this.bindings = bindings;
  }

  async addBinding(dto: CreateUserDeviceBindingDto) {
    await this.bindingsService.createUserDeviceBinding(dto);
    this.loadBindings(this.userId);
  }

  async updateBinding(id: string, dto: UpdateUserDeviceBindingDto) {
    await this.bindingsService.updateUserDeviceBinding(id, dto);
    this.loadBindings(this.userId);
  }

  async deleteBinding(id: string) {
    await this.bindingsService.deleteUserDeviceBinding(id);
    this.loadBindings(this.userId);
  }

  async loadSuggestions(userId: string) {
    const suggestions = await this.bindingsService.getUserDeviceSuggestions(userId);
    this.suggestions = suggestions;
  }
}
```

### Device-Entity Filter Preset

```typescript
export class DeviceEntityFilterDialog {
  presets = [
    { value: 'all_sensors', label: 'Alle Sensoren' },
    { value: 'battery_only', label: 'Nur Batterien' },
    { value: 'controls_only', label: 'Nur Controls' },
    { value: 'location_only', label: 'Nur Standort' },
  ];

  async applyPreset(deviceId: string, preset: string) {
    const bindings = await this.bindingsService.applyDeviceEntityPreset(deviceId, preset);
    this.bindings = bindings;
  }
}
```

---

## Erweiterte Features

### History/Audit Logging

**TODO:** Implementierung eines Audit-Logs für Binding-Changes.

```typescript
// Audit-Log Entity (zukünftig)
@Entity('binding_audit_logs')
export class BindingAuditLog {
  id: string;
  bindingType: 'user-device' | 'device-entity' | 'device-area';
  bindingId: string;
  action: 'create' | 'update' | 'delete';
  userId: string; // Wer hat die Änderung gemacht?
  changes: Record<string, any>;
  timestamp: Date;
}
```

### Auto-Cleanup Cron Job

```typescript
// In einem Cron-Service (zukünftig)
@Cron('0 0 * * *') // Täglich um Mitternacht
async cleanupExpiredBindings() {
  const count = await this.deviceAreaBindingService.cleanupExpiredBindings();
  this.logger.log(`Cleaned up ${count} expired device-area bindings`);
}
```

---

## Zusammenfassung

✅ **Implementiert:**
- User-Device Bindings (User → Devices)
- Device-Entity Bindings (Devices → Entities)
- Device-Area Bindings (Devices → Areas)
- REST API Endpoints für alle Binding-Typen
- Suggestion-Endpoints für Bulk-Import
- Filter-Presets für Entity-Selection
- Auto-Sync aus HomeAssistant
- Temporäre Bindings mit Auto-Cleanup
- Datenbank-Migration

📋 **Backlog:**
- Audit-Logging für Binding-Changes
- Intelligente Suggestion-Algorithmen
- Frontend Edit-Dialoge (Angular Components)
- Bulk-Update/Delete Endpoints
- Export/Import von Bindings (JSON)
- Permissions-Check (welcher User darf welche Bindings editieren)

---

## Fragen?

Bei Fragen oder Feature-Requests: Siehe `CLAUDE.md` oder öffne ein Issue.

