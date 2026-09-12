# Entity Spec: `AppTerminal`

**Tabelle:** `app_terminals`  
**Modul:** `backend/nest-app/src/modules/speech/entities/app-terminal.entity.ts`  
**Ticket:** LUD28-107 (LUD28-59.2)

---

## 1. Übersicht

Repräsentiert physische/virtuelle Endgeräte (Browser, Tablet, Kiosk), die Speech-Input nutzen.

**Zweck:**
- Terminal-Registrierung und -Verwaltung
- Capabilities-Tracking (Mikrofon, Lautsprecher)
- Zuordnung zu Benutzern
- Logging von Eingaben pro Terminal

---

## 2. Felder

| Spalte | TypeScript-Typ | DB-Typ | Nullable | Default | Kommentar |
|--------|----------------|--------|----------|---------|-----------|
| `id` | `string` | `UUID` | ❌ | PK | Primärschlüssel (Surrogat) |
| `terminalId` | `string` | `VARCHAR(255)` | ❌ | – | Stabiler Identifier (UNIQUE, z.B. Browser-Fingerprint) |
| `name` | `string` | `VARCHAR(255)` | ❌ | – | Benutzerfreundlicher Name |
| `description` | `string` | `TEXT` | ✅ | `null` | Beschreibung/Notizen |
| `type` | `TerminalType` | `ENUM` | ❌ | `'browser'` | Terminal-Typ (browser, mobile, tablet, kiosk, smart-tv, other) |
| `location` | `string` | `TEXT` | ✅ | `null` | Standort (z.B. "Wohnzimmer", "Küche") |
| `capabilitiesJson` | `Record<string, boolean>` | `JSONB` | ✅ | `null` | Capabilities (microphone, speaker, camera, touchscreen) |
| `status` | `TerminalStatus` | `ENUM` | ❌ | `'active'` | Status (active, inactive, maintenance) |
| `lastActiveAt` | `Date` | `TIMESTAMP` | ✅ | `null` | Letzter Ping/Zugriff |
| `assignedUserId` | `string` | `UUID` | ✅ | `null` | Optional: Primärbenutzer |
| `allowedActionsJson` | `string[]` | `JSONB` | ✅ | `null` | Erlaubte Actions (z.B. `['speech_input', 'tts', 'ha_control']`) |
| `settingsJson` | `Record<string, any>` | `JSONB` | ✅ | `null` | Terminal-spezifische Settings |
| `metadataJson` | `Record<string, any>` | `JSONB` | ✅ | `null` | Zusätzliche Metadaten (IP, User-Agent, etc.) |
| `createdAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Registrierungszeitpunkt |
| `updatedAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Letztes Update |

---

## 3. Enums

### 3.1 `TerminalType`

```typescript
export enum TerminalType {
  BROWSER = 'browser',       // Desktop/Laptop Browser
  MOBILE = 'mobile',         // Smartphone
  TABLET = 'tablet',         // Tablet
  KIOSK = 'kiosk',          // Kiosk-Modus (Vollbild)
  SMART_TV = 'smart-tv',    // Smart TV / Fire TV
  OTHER = 'other',          // Sonstige
}
```

### 3.2 `TerminalStatus`

```typescript
export enum TerminalStatus {
  ACTIVE = 'active',         // Aktiv
  INACTIVE = 'inactive',     // Temporär inaktiv
  MAINTENANCE = 'maintenance', // Wartung/Konfiguration
}
```

---

## 4. Relationen

### 4.1 Ausgehende Relationen (Foreign Keys in dieser Tabelle)

| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |
|----------|-----|---------------|-----------|-----------|-----------|
| `assignedUser` | `n:1` | `User` | `assigned_user_id` | `SET NULL` | `CASCADE` |

### 4.2 Eingehende Relationen

| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |
|----------|-----|---------------|-----------|-----------|-----------|
| `terminalRights` | `1:1` | `TerminalRights` | `terminal_id` | `CASCADE` | `CASCADE` |
| `speechInputs` | `1:n` | `SpeechHumanInput` | `terminal_id` | `SET NULL` | `CASCADE` |
| `intentLogs` | `1:n` | `IntentLog` | `terminal_id` | `SET NULL` | `CASCADE` |
| `transcripts` | `1:n` | `SpeechTranscript` | `terminal_id` | `SET NULL` | `CASCADE` |
| `allowedUsers` | `m:n` | `User` | via `user_allowed_terminals` | `CASCADE` | `CASCADE` |

---

## 5. Constraints & Indizes

### 5.1 Primärschlüssel
```sql
CONSTRAINT pk_app_terminals PRIMARY KEY (id)
```

### 5.2 Unique Constraints
```sql
CONSTRAINT uq_app_terminals__terminal_id UNIQUE (terminal_id)
```

### 5.3 Foreign Keys
```sql
CONSTRAINT fk_app_terminals__users__assigned_user_id 
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) 
  ON DELETE SET NULL ON UPDATE CASCADE
```

### 5.4 Indizes
```sql
CREATE INDEX ix_app_terminals__terminal_id ON app_terminals(terminal_id);
CREATE INDEX ix_app_terminals__status ON app_terminals(status);
CREATE INDEX ix_app_terminals__last_active_at ON app_terminals(last_active_at);
```

**Rationale:**
- `terminal_id`: Natürlicher Schlüssel (häufige Lookups)
- `status`: Filterung aktiver Terminals
- `last_active_at`: Identifikation inaktiver Terminals

---

## 6. Beispiel-Daten

### 6.1 Desktop-Browser

```typescript
{
  id: "770e8400-e29b-41d4-a716-446655440002",
  terminalId: "fp_1234567890abcdef",
  name: "Arbeits-PC (Chrome)",
  description: "Desktop-Browser am Arbeitsplatz",
  type: TerminalType.BROWSER,
  location: "Arbeitszimmer",
  capabilitiesJson: {
    microphone: true,
    speaker: true,
    camera: false,
    touchscreen: false
  },
  status: TerminalStatus.ACTIVE,
  lastActiveAt: "2025-12-03T09:45:00Z",
  assignedUserId: "550e8400-e29b-41d4-a716-446655440000",
  allowedActionsJson: ["speech_input", "tts", "ha_control"],
  settingsJson: {
    autoStartRecording: false,
    ttsVoice: "de-DE-Neural2-A",
    volume: 0.8
  },
  metadataJson: {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    ipAddress: "192.168.1.100",
    screenResolution: "1920x1080"
  },
  createdAt: "2024-06-10T08:00:00Z",
  updatedAt: "2025-12-03T09:45:00Z"
}
```

### 6.2 Kiosk-Tablet

```typescript
{
  id: "880e8400-e29b-41d4-a716-446655440003",
  terminalId: "kiosk_kitchen_001",
  name: "Küchen-Tablet",
  description: "Fire HD 10 in Küche montiert",
  type: TerminalType.TABLET,
  location: "Küche",
  capabilitiesJson: {
    microphone: true,
    speaker: true,
    camera: true,
    touchscreen: true
  },
  status: TerminalStatus.ACTIVE,
  lastActiveAt: "2025-12-03T10:15:00Z",
  assignedUserId: null, // Shared device
  allowedActionsJson: ["speech_input", "tts", "ha_control"],
  settingsJson: {
    kioskMode: true,
    autoStartRecording: true,
    screenTimeout: 30
  },
  metadataJson: {
    deviceModel: "Amazon Fire HD 10",
    osVersion: "Fire OS 8"
  },
  createdAt: "2024-08-20T12:00:00Z",
  updatedAt: "2025-12-03T10:15:00Z"
}
```

---

## 7. Capabilities Schema

```typescript
interface TerminalCapabilities {
  microphone?: boolean;   // Audio-Eingabe
  speaker?: boolean;      // Audio-Ausgabe (TTS)
  camera?: boolean;       // Video-Eingabe (zukünftig)
  touchscreen?: boolean;  // Touch-Interaktion
  gps?: boolean;         // Geolocation (mobile)
  nfc?: boolean;         // NFC (mobile)
  wakeWord?: boolean;    // Wake-Word-Detection (zukünftig)
}
```

---

## 8. Migration Notes

### 8.1 Mongo → MariaDB Mapping

**Quell-Schema:** `backend/nest-app/src/modules/speech/schemas/terminal.schema.ts`

```typescript
// Mongo (Mongoose)
{
  _id: ObjectId,
  terminalId: String,
  name: String,
  type: String,
  capabilities: Object,
  // ...
}
```

**Mapping:**
- `_id` → `id` (UUID generieren)
- `capabilities` → `capabilitiesJson` (JSONB)

### 8.2 Terminal-Registrierung

```typescript
// POST /api/speech/terminals/register
async registerTerminal(dto: RegisterTerminalDto): Promise<AppTerminal> {
  const terminal = await this.terminalsRepo.save({
    terminalId: dto.fingerprint, // Browser-Fingerprint
    name: dto.name || 'Unnamed Terminal',
    type: dto.type || TerminalType.BROWSER,
    capabilitiesJson: dto.capabilities,
    status: TerminalStatus.ACTIVE,
    lastActiveAt: new Date(),
    metadataJson: {
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
    }
  });
  
  // Auto-create TerminalRights
  await this.terminalRightsRepo.save({
    terminalId: terminal.id,
    roleKey: 'default',
    status: TerminalRightsStatus.ACTIVE,
  });
  
  return terminal;
}
```

---

## 9. Offene Fragen

- [ ] **Terminal-Authentifizierung:** JWT-Tokens pro Terminal? (Separate Session-Verwaltung?)
- [ ] **Terminal-Gruppen:** Gruppierung von Terminals (z.B. "Alle Kioske")? (Phase 2)
- [ ] **Auto-Deaktivierung:** Inaktive Terminals nach X Tagen deaktivieren? (Cronjob)

---

**Status:** ✅ Spezifikation finalisiert  
**Review:** 2025-12-03  
**Freigegeben für:** LUD28-59.3 (Entity-Implementierung)

