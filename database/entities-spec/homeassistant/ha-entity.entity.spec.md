# Entity Spec: `HaEntity`

**Tabelle:** `ha_entities`  
**Modul:** `backend/nest-app/src/modules/homeassistant/entities/ha-entity.entity.ts`  
**Ticket:** LUD28-107 (LUD28-59.2)

---

## 1. Übersicht

Zentrale Entity für alle HomeAssistant-Entities (Lights, Switches, Sensors, etc.).

**Zweck:**
- Stammdaten-Verwaltung aller HA-Entities
- Domain-basierte Kategorisierung
- Zuordnung zu Areas und Devices
- Basis für State-Historie

---

## 2. Felder

| Spalte | TypeScript-Typ | DB-Typ | Nullable | Default | Kommentar |
|--------|----------------|--------|----------|---------|-----------|
| `entityId` | `string` | `VARCHAR(255)` | ❌ | PK | Natürlicher Primärschlüssel (z.B. `light.wohnzimmer`) |
| `domain` | `HaEntityDomain` | `ENUM` | ❌ | – | Extrahiert aus `entity_id` (light, switch, sensor, etc.) |
| `objectId` | `string` | `VARCHAR(255)` | ❌ | – | Extrahiert aus `entity_id` (z.B. `wohnzimmer` aus `light.wohnzimmer`) |
| `friendlyName` | `string` | `VARCHAR(255)` | ❌ | – | Anzeigename (z.B. "Wohnzimmer-Licht") |
| `aliases` | `string[]` | `JSONB` | ✅ | `null` | Alternative Namen für Speech-Erkennung |
| `icon` | `string` | `VARCHAR(100)` | ✅ | `null` | Material Design Icon (z.B. `mdi:lightbulb`) |
| `deviceClass` | `string` | `VARCHAR(100)` | ✅ | `null` | HA Device Class (z.B. `motion`, `temperature`) |
| `unitOfMeasurement` | `string` | `VARCHAR(100)` | ✅ | `null` | Einheit (z.B. `°C`, `%`, `W`) |
| `areaId` | `string` | `VARCHAR(255)` | ✅ | `null` | FK zu `ha_areas.area_id` |
| `deviceId` | `string` | `VARCHAR(255)` | ✅ | `null` | FK zu `ha_devices.device_id` |
| `platform` | `string` | `VARCHAR(255)` | ✅ | `null` | Integration (z.B. `mqtt`, `hue`, `deconz`) |
| `disabled` | `boolean` | `BOOLEAN` | ❌ | `false` | Entity deaktiviert in HA |
| `hidden` | `boolean` | `BOOLEAN` | ❌ | `false` | Entity versteckt in UI |
| `entityCategory` | `string` | `JSONB` | ✅ | `null` | HA Entity Category (config, diagnostic) |
| `createdAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Erstmalige Erkennung |
| `updatedAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Letztes Update der Metadaten |

---

## 3. Enums

### 3.1 `HaEntityDomain`

```typescript
export enum HaEntityDomain {
  LIGHT = 'light',
  SWITCH = 'switch',
  SENSOR = 'sensor',
  BINARY_SENSOR = 'binary_sensor',
  CLIMATE = 'climate',
  MEDIA_PLAYER = 'media_player',
  COVER = 'cover',
  FAN = 'fan',
  CAMERA = 'camera',
  LOCK = 'lock',
  ALARM_CONTROL_PANEL = 'alarm_control_panel',
  AUTOMATION = 'automation',
  PERSON = 'person',
  ZONE = 'zone',
  OTHER = 'other',
}
```

---

## 4. Relationen

### 4.1 Ausgehende Relationen (Foreign Keys in dieser Tabelle)

| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |
|----------|-----|---------------|-----------|-----------|-----------|
| `area` | `n:1` | `HaArea` | `area_id` | `SET NULL` | `CASCADE` |
| `device` | `n:1` | `HaDevice` | `device_id` | `SET NULL` | `CASCADE` |

### 4.2 Eingehende Relationen

| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |
|----------|-----|---------------|-----------|-----------|-----------|
| `states` | `1:n` | `HaEntityState` | `entity_id` | `CASCADE` | `CASCADE` |
| `transcripts` | `1:n` | `SpeechTranscript` | `assigned_entity_id` | `SET NULL` | `CASCADE` |

---

## 5. Constraints & Indizes

### 5.1 Primärschlüssel
```sql
CONSTRAINT pk_ha_entities PRIMARY KEY (entity_id)
```

### 5.2 Foreign Keys
```sql
CONSTRAINT fk_ha_entities__ha_areas__area_id 
  FOREIGN KEY (area_id) REFERENCES ha_areas(area_id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

CONSTRAINT fk_ha_entities__ha_devices__device_id 
  FOREIGN KEY (device_id) REFERENCES ha_devices(device_id) 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

### 5.3 Indizes
```sql
CREATE UNIQUE INDEX uq_ha_entities__entity_id ON ha_entities(entity_id);
CREATE INDEX ix_ha_entities__domain ON ha_entities(domain);
CREATE INDEX ix_ha_entities__area_id ON ha_entities(area_id);
CREATE INDEX ix_ha_entities__device_id ON ha_entities(device_id);
```

**Rationale:**
- `entity_id`: Natürlicher Schlüssel (UNIQUE + PK)
- `domain`: Filterung nach Entity-Typ
- `area_id`, `device_id`: JOIN-Performance

---

## 6. Beispiel-Daten

### 6.1 Light Entity

```typescript
{
  entityId: "light.wohnzimmer_decke",
  domain: HaEntityDomain.LIGHT,
  objectId: "wohnzimmer_decke",
  friendlyName: "Wohnzimmer Deckenleuchte",
  aliases: ["Decke Wohnzimmer", "Hauptlicht Wohnzimmer"],
  icon: "mdi:lightbulb",
  deviceClass: null,
  unitOfMeasurement: null,
  areaId: "wohnzimmer",
  deviceId: "hue_bridge_0017880102c4e75f",
  platform: "hue",
  disabled: false,
  hidden: false,
  entityCategory: null,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-01T08:30:00Z"
}
```

### 6.2 Sensor Entity

```typescript
{
  entityId: "sensor.wohnzimmer_temperatur",
  domain: HaEntityDomain.SENSOR,
  objectId: "wohnzimmer_temperatur",
  friendlyName: "Wohnzimmer Temperatur",
  aliases: ["Temp Wohnzimmer"],
  icon: "mdi:thermometer",
  deviceClass: "temperature",
  unitOfMeasurement: "°C",
  areaId: "wohnzimmer",
  deviceId: "zigbee_sensor_temp_001",
  platform: "zigbee2mqtt",
  disabled: false,
  hidden: false,
  entityCategory: null,
  createdAt: "2024-03-20T14:00:00Z",
  updatedAt: "2024-12-03T10:00:00Z"
}
```

---

## 7. Domain-Extraktion

```typescript
// Automatische Extraktion bei Entity-Import
function parseEntityId(entityId: string): { domain: string; objectId: string } {
  const [domain, objectId] = entityId.split('.');
  return { domain, objectId };
}

// Beispiel
parseEntityId('light.wohnzimmer_decke')
// → { domain: 'light', objectId: 'wohnzimmer_decke' }
```

---

## 8. Migration Notes

### 8.1 HA-Import Flow

```typescript
// HomeAssistant API Fetch
async importEntitiesFromHA(): Promise<void> {
  const haClient = this.homeAssistantService.getClient();
  const haStates = await haClient.getStates();
  
  for (const state of haStates) {
    const { domain, objectId } = this.parseEntityId(state.entity_id);
    
    await this.haEntitiesRepo.upsert({
      entityId: state.entity_id,
      domain: domain as HaEntityDomain,
      objectId: objectId,
      friendlyName: state.attributes.friendly_name || objectId,
      icon: state.attributes.icon,
      deviceClass: state.attributes.device_class,
      unitOfMeasurement: state.attributes.unit_of_measurement,
      areaId: state.attributes.area_id,
      deviceId: state.attributes.device_id,
      platform: state.attributes.platform,
      disabled: state.attributes.disabled,
      hidden: state.attributes.hidden,
    }, ['entity_id']);
  }
}
```

---

## 9. Speech-Recognition Optimierung

### 9.1 Aliases für bessere Erkennung

```typescript
// Beispiel: Automatische Alias-Generierung
function generateAliases(friendlyName: string): string[] {
  const aliases: string[] = [];
  
  // Entferne Raumnamen aus Friendly Name
  // "Wohnzimmer Deckenleuchte" → "Deckenleuchte"
  const withoutRoom = friendlyName.replace(/^(Wohnzimmer|Küche|Bad|Schlafzimmer)\s+/i, '');
  if (withoutRoom !== friendlyName) {
    aliases.push(withoutRoom);
  }
  
  // Kurznamen
  // "Deckenleuchte" → "Decke"
  if (friendlyName.includes('Deckenleuchte')) {
    aliases.push('Decke');
  }
  if (friendlyName.includes('Stehlampe')) {
    aliases.push('Lampe');
  }
  
  return aliases;
}
```

---

## 10. Offene Fragen

- [ ] **Entity-Historie:** Löschen/Deaktivieren von Entities tracken? (Soft-Delete mit `deleted_at`?)
- [ ] **Custom-Attributes:** Zusätzliche JSONB-Spalte `custom_attributes`? (Zunächst nicht nötig)
- [ ] **Entity-Gruppen:** Separate Tabelle `ha_entity_groups`? (Phase 2)

---

**Status:** ✅ Spezifikation finalisiert  
**Review:** 2025-12-03  
**Freigegeben für:** LUD28-59.3 (Entity-Implementierung)

