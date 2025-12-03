# DBM-SCHEMA-03 – TypeORM-Mapping (Draft)

**Ticket:** LUD28-106 (LUD28-59.1) – Vorbereitung: Review & Scope  
**Status:** 🔶 Draft – Für Review & Finalisierung in LUD28-59.2  
**Bezug:**
- Grundlage: `database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md`
- Schlüssel & Constraints: `database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md`
- HA-Spezifikation: `backend/nest-app/src/modules/homeassistant/schemas/database-design.md`

---

## 1. Scope & Ziel

Dieses Dokument definiert das **TypeORM-Entity-Mapping** für alle in DBM-SCHEMA-01 beschriebenen Tabellen.

**Ziel:**
- Vollständige Entity-Definitionen mit TypeORM-Decorators
- FK-Constraint-Namen gemäß `DBM-SCHEMA-02` Konventionen
- Klare Abbildung von 1:1, 1:n, n:m Beziehungen
- Index- und Unique-Definitionen

**Nicht in diesem Draft:**
- Konkrete TypeScript-Dateipfade (siehe LUD28-59.3)
- Migrations-Code (siehe LUD28-59.4)
- DTO/Service-Layer (separate Tickets)

---

## 2. Globale TypeORM-Konventionen

### 2.1 Primärschlüssel-Strategie

**✅ Entscheidung (PoC):** Alle Entities nutzen **UUID** als Surrogat-PK.

```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
```

**Alternative (für spätere Evaluierung):**
```typescript
// Option A: Auto-Increment INT
@PrimaryGeneratedColumn()
id: number;

// Option B: ULID (requires custom generator)
@PrimaryGeneratedColumn('uuid')
@Generated('uuid')
id: string;
```

### 2.2 Namenskonventionen

- **Tabellennamen:** `snake_case` (z.B. `user_allowed_terminals`)
- **Spaltennamen:** `snake_case` (z.B. `created_at`, `entity_id`)
- **FK-Constraints:** `fk_<from_table>__<to_table>__<column>` (z.B. `fk_user_rights__users__user_id`)
- **Unique-Constraints:** `uq_<table>__<column>` (z.B. `uq_users__username`)
- **Indizes:** `ix_<table>__<column>` (z.B. `ix_speech_transcripts__created_at`)

### 2.3 Timestamps

Alle Entities erhalten (sofern nicht anders dokumentiert):

```typescript
@CreateDateColumn({ name: 'created_at' })
createdAt: Date;

@UpdateDateColumn({ name: 'updated_at' })
updatedAt: Date;
```

### 2.4 ON DELETE / ON UPDATE Verhalten

**Default-Regeln (aus DBM-SCHEMA-02):**

| Beziehungstyp | ON DELETE | ON UPDATE |
|--------------|-----------|-----------|
| Bewegungs-/Logtabellen → User/Terminal | `SET NULL` | `CASCADE` |
| Stammdaten → abhängige Tabellen | `CASCADE` | `CASCADE` |
| 1:1 Rechte-Tabellen | `CASCADE` | `CASCADE` |
| M:N Join-Tabellen | `CASCADE` | `CASCADE` |

---

## 3. Entity-Definitionen (PoC-Scope)

### 3.1 Benutzer & Authentifizierung

#### 3.1.1 Entity: `User`

**Tabelle:** `users`  
**Datei:** `backend/nest-app/src/modules/users/entities/user.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserRights } from './user-rights.entity';
import { AppTerminal } from '../../speech/entities/app-terminal.entity';
import { SpeechHumanInput } from '../../speech/entities/speech-human-input.entity';
import { SpeechTranscript } from '../../logging/entities/speech-transcript.entity';

@Entity('users')
@Index('ix_users__created_at', ['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  @Index('uq_users__username', { unique: true })
  username: string;

  @Column({ unique: true, length: 255 })
  @Index('uq_users__email', { unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'jsonb', nullable: true, name: 'profile_data' })
  profileData?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => UserRights, userRights => userRights.user, { cascade: true })
  userRights?: UserRights;

  @OneToMany(() => SpeechHumanInput, input => input.user)
  speechInputs?: SpeechHumanInput[];

  @OneToMany(() => SpeechTranscript, transcript => transcript.user)
  transcripts?: SpeechTranscript[];

  @ManyToMany(() => AppTerminal, terminal => terminal.allowedUsers)
  allowedTerminals?: AppTerminal[];
}
```

**Kommentare:**
- `profileData`: JSONB für flexible Zusatzinfos (PostgreSQL-spezifisch; MariaDB: TEXT + JSON validation)
- `passwordHash`: Speichert bcrypt/argon2-Hash
- Relation zu `UserRights` ist 1:1 mit CASCADE (User-Löschung entfernt Rechte)

---

#### 3.1.2 Entity: `UserRights`

**Tabelle:** `user_rights`  
**Datei:** `backend/nest-app/src/modules/users/entities/user-rights.entity.ts`

```typescript
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { AppTerminal } from '../../speech/entities/app-terminal.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  REGULAR = 'regular',
  GUEST = 'guest',
  TERMINAL = 'terminal',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

@Entity('user_rights')
@Index('ix_user_rights__role', ['role'])
@Index('ix_user_rights__status', ['status'])
export class UserRights {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.REGULAR })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'permissions_json' })
  permissionsJson?: string[];

  // Boolean Permissions (from schema)
  @Column({ default: true, name: 'can_use_speech_input' })
  canUseSpeechInput: boolean;

  @Column({ default: true, name: 'can_view_own_inputs' })
  canViewOwnInputs: boolean;

  @Column({ default: false, name: 'can_view_all_inputs' })
  canViewAllInputs: boolean;

  @Column({ default: false, name: 'can_delete_inputs' })
  canDeleteInputs: boolean;

  @Column({ default: false, name: 'can_manage_terminals' })
  canManageTerminals: boolean;

  @Column({ default: false, name: 'can_manage_users' })
  canManageUsers: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, user => user.userRights, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_user_rights__users__user_id' 
  })
  user: User;

  @ManyToMany(() => AppTerminal, terminal => terminal.id)
  @JoinTable({
    name: 'user_allowed_terminals',
    joinColumn: { 
      name: 'user_id', 
      referencedColumnName: 'userId',
      foreignKeyConstraintName: 'fk_user_allowed_terminals__users__user_id'
    },
    inverseJoinColumn: { 
      name: 'terminal_id', 
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_user_allowed_terminals__app_terminals__terminal_id'
    },
  })
  allowedTerminals?: AppTerminal[];
}
```

**Kommentare:**
- `userId` ist PK **und** FK zu `users.id` (1:1-Relation)
- `@JoinColumn` setzt FK-Constraint-Name gemäß Konvention
- M:N zu `AppTerminal` via `user_allowed_terminals` Join-Tabelle

---

#### 3.1.3 Join-Entity: `UserAllowedTerminal`

**Tabelle:** `user_allowed_terminals`  
**Datei:** `backend/nest-app/src/modules/users/entities/user-allowed-terminal.entity.ts`

**Hinweis:** Diese Tabelle wird implizit durch `@ManyToMany` + `@JoinTable` in `UserRights` erstellt. Explizite Entity nur nötig, wenn zusätzliche Spalten (z.B. `granted_at`, `granted_by`) benötigt werden.

**Explizite Variante (optional):**

```typescript
import { Entity, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { AppTerminal } from '../../speech/entities/app-terminal.entity';

@Entity('user_allowed_terminals')
@Index('ix_user_allowed_terminals__user_id', ['userId'])
@Index('ix_user_allowed_terminals__terminal_id', ['terminalId'])
export class UserAllowedTerminal {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @PrimaryColumn('uuid', { name: 'terminal_id' })
  terminalId: string;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt?: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_user_allowed_terminals__users__user_id' 
  })
  user: User;

  @ManyToOne(() => AppTerminal, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'terminal_id', 
    foreignKeyConstraintName: 'fk_user_allowed_terminals__app_terminals__terminal_id' 
  })
  terminal: AppTerminal;
}
```

---

### 3.2 Speech & Terminals

#### 3.2.1 Entity: `AppTerminal`

**Tabelle:** `app_terminals`  
**Datei:** `backend/nest-app/src/modules/speech/entities/app-terminal.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, OneToMany, ManyToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TerminalRights } from './terminal-rights.entity';
import { SpeechHumanInput } from './speech-human-input.entity';

export enum TerminalType {
  BROWSER = 'browser',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  KIOSK = 'kiosk',
  SMART_TV = 'smart-tv',
  OTHER = 'other',
}

export enum TerminalStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Entity('app_terminals')
@Index('ix_app_terminals__terminal_id', ['terminalId'])
@Index('ix_app_terminals__status', ['status'])
@Index('ix_app_terminals__last_active_at', ['lastActiveAt'])
export class AppTerminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, name: 'terminal_id' })
  @Index('uq_app_terminals__terminal_id', { unique: true })
  terminalId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TerminalType, default: TerminalType.BROWSER })
  type: TerminalType;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'capabilities_json' })
  capabilitiesJson?: Record<string, boolean>;

  @Column({ type: 'enum', enum: TerminalStatus, default: TerminalStatus.ACTIVE })
  status: TerminalStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_active_at' })
  lastActiveAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_user_id' })
  assignedUserId?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'allowed_actions_json' })
  allowedActionsJson?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'settings_json' })
  settingsJson?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata_json' })
  metadataJson?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'assigned_user_id', 
    foreignKeyConstraintName: 'fk_app_terminals__users__assigned_user_id' 
  })
  assignedUser?: User;

  @OneToOne(() => TerminalRights, rights => rights.terminal, { cascade: true })
  terminalRights?: TerminalRights;

  @OneToMany(() => SpeechHumanInput, input => input.terminal)
  speechInputs?: SpeechHumanInput[];

  @ManyToMany(() => User, user => user.allowedTerminals)
  allowedUsers?: User[];
}
```

**Kommentare:**
- `terminalId`: Stabiler technischer Schlüssel (z.B. Browser-Fingerprint, Device-ID)
- `assignedUserId`: Optional, Terminal kann Primärbenutzer haben (`ON DELETE SET NULL`)
- `capabilitiesJson`: Beispiel `{ microphone: true, camera: false, speaker: true }`

---

#### 3.2.2 Entity: `TerminalRights`

**Tabelle:** `terminal_rights`  
**Datei:** `backend/nest-app/src/modules/speech/entities/terminal-rights.entity.ts`

```typescript
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AppTerminal } from './app-terminal.entity';

export enum TerminalRightsStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  MAINTENANCE = 'maintenance',
}

@Entity('terminal_rights')
@Index('ix_terminal_rights__status', ['status'])
@Index('ix_terminal_rights__role_key', ['roleKey'])
export class TerminalRights {
  @PrimaryColumn('uuid', { name: 'terminal_id' })
  terminalId: string;

  @Column({ length: 100, nullable: true, name: 'role_key' })
  roleKey?: string; // e.g., 'kiosk', 'personal_device', 'admin_console'

  @Column({ type: 'enum', enum: TerminalRightsStatus, default: TerminalRightsStatus.ACTIVE })
  status: TerminalRightsStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'allowed_actions_json' })
  allowedActionsJson?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'restrictions_json' })
  restrictionsJson?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata_json' })
  metadataJson?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => AppTerminal, terminal => terminal.terminalRights, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'terminal_id', 
    foreignKeyConstraintName: 'fk_terminal_rights__app_terminals__terminal_id' 
  })
  terminal: AppTerminal;
}
```

---

#### 3.2.3 Entity: `SpeechHumanInput`

**Tabelle:** `speech_human_inputs`  
**Datei:** `backend/nest-app/src/modules/speech/entities/speech-human-input.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AppTerminal } from './app-terminal.entity';

@Entity('speech_human_inputs')
@Index('ix_speech_human_inputs__created_at', ['createdAt'])
@Index('ix_speech_human_inputs__user_id', ['userId'])
@Index('ix_speech_human_inputs__terminal_id', ['terminalId'])
export class SpeechHumanInput {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'terminal_id' })
  terminalId?: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  language?: string;

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_speech_human_inputs__users__user_id' 
  })
  user?: User;

  @ManyToOne(() => AppTerminal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'terminal_id', 
    foreignKeyConstraintName: 'fk_speech_human_inputs__app_terminals__terminal_id' 
  })
  terminal?: AppTerminal;
}
```

**Kommentare:**
- User/Terminal sind optional → Pseudonymisierung möglich (`ON DELETE SET NULL`)
- `metadata`: Zusätzliche Infos (z.B. Audio-Metadaten, Session-ID)

---

#### 3.2.4 Entity: `SpeechTestInput`

**Tabelle:** `speech_test_inputs`  
**Datei:** `backend/nest-app/src/modules/speech/entities/speech-test-input.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('speech_test_inputs')
@Index('ix_speech_test_inputs__created_at', ['createdAt'])
export class SpeechTestInput {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true, name: 'expected_intent' })
  expectedIntent?: string;

  @Column({ type: 'text', nullable: true, name: 'actual_intent' })
  actualIntent?: string;

  @Column({ type: 'boolean', default: false })
  passed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_speech_test_inputs__users__user_id' 
  })
  user?: User;
}
```

---

### 3.3 Logging & Kategorisierung

#### 3.3.1 Entity: `Category`

**Tabelle:** `categories`  
**Datei:** `backend/nest-app/src/modules/logging/entities/category.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { IntentLog } from './intent-log.entity';
import { SpeechTranscript } from './speech-transcript.entity';

@Entity('categories')
@Index('uq_categories__key', ['key'], { unique: true })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  key: string; // e.g., 'home_assistant_command', 'system_query'

  @Column({ length: 255 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => IntentLog, log => log.category)
  intentLogs?: IntentLog[];

  @OneToMany(() => SpeechTranscript, transcript => transcript.category)
  transcripts?: SpeechTranscript[];
}
```

---

#### 3.3.2 Entity: `IntentLog`

**Tabelle:** `intent_logs`  
**Datei:** `backend/nest-app/src/modules/logging/entities/intent-log.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Category } from './category.entity';
import { AppTerminal } from '../../speech/entities/app-terminal.entity';

@Entity('intent_logs')
@Index('ix_intent_logs__timestamp', ['timestamp'])
@Index('ix_intent_logs__category_id', ['categoryId'])
@Index('ix_intent_logs__terminal_id', ['terminalId'])
export class IntentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'text' })
  transcript: string;

  @Column({ length: 255, name: 'intent_key' })
  intentKey: string; // e.g., 'turn_on_light', 'query_weather'

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'keywords_json' })
  keywordsJson?: string[];

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Column({ type: 'uuid', nullable: true, name: 'terminal_id' })
  terminalId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'category_id', 
    foreignKeyConstraintName: 'fk_intent_logs__categories__category_id' 
  })
  category?: Category;

  @ManyToOne(() => AppTerminal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'terminal_id', 
    foreignKeyConstraintName: 'fk_intent_logs__app_terminals__terminal_id' 
  })
  terminal?: AppTerminal;
}
```

---

#### 3.3.3 Entity: `SpeechTranscript`

**Tabelle:** `speech_transcripts`  
**Datei:** `backend/nest-app/src/modules/logging/entities/speech-transcript.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AppTerminal } from '../../speech/entities/app-terminal.entity';
import { Category } from './category.entity';
import { HaArea } from '../../homeassistant/entities/ha-area.entity';
import { HaEntity } from '../../homeassistant/entities/ha-entity.entity';

@Entity('speech_transcripts')
@Index('ix_speech_transcripts__created_at', ['createdAt'])
@Index('ix_speech_transcripts__user_id', ['userId'])
@Index('ix_speech_transcripts__terminal_id', ['terminalId'])
@Index('ix_speech_transcripts__category_id', ['categoryId'])
@Index('ix_speech_transcripts__assigned_area_id', ['assignedAreaId'])
@Index('ix_speech_transcripts__assigned_entity_id', ['assignedEntityId'])
export class SpeechTranscript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'terminal_id' })
  terminalId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId?: string;

  @Column({ type: 'text' })
  transcript: string;

  @Column({ type: 'text', nullable: true, name: 'recognized_intent' })
  recognizedIntent?: string;

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_area_id' })
  assignedAreaId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_entity_id' })
  assignedEntityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_speech_transcripts__users__user_id' 
  })
  user?: User;

  @ManyToOne(() => AppTerminal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'terminal_id', 
    foreignKeyConstraintName: 'fk_speech_transcripts__app_terminals__terminal_id' 
  })
  terminal?: AppTerminal;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'category_id', 
    foreignKeyConstraintName: 'fk_speech_transcripts__categories__category_id' 
  })
  category?: Category;

  @ManyToOne(() => HaArea, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'assigned_area_id', 
    foreignKeyConstraintName: 'fk_speech_transcripts__ha_areas__assigned_area_id' 
  })
  assignedArea?: HaArea;

  @ManyToOne(() => HaEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'assigned_entity_id', 
    foreignKeyConstraintName: 'fk_speech_transcripts__ha_entities__assigned_entity_id' 
  })
  assignedEntity?: HaEntity;
}
```

**Kommentare:**
- Verknüpfung zu HA-Entities für Kontext (z.B. „Licht im Wohnzimmer" → `assigned_area_id`)
- `assignedAreaId` / `assignedEntityId`: String-Spalten (natürliche Keys aus HA)

---

#### 3.3.4 Entity: `EventLog`

**Tabelle:** `event_logs`  
**Datei:** `backend/nest-app/src/modules/logging/entities/event-log.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EventLogType {
  WEBSOCKET = 'websocket',
  ACTION = 'action',
  ERROR = 'error',
  INFO = 'info',
  DEBUG = 'debug',
}

@Entity('event_logs')
@Index('ix_event_logs__timestamp', ['timestamp'])
@Index('ix_event_logs__type', ['type'])
@Index('ix_event_logs__user_id', ['userId'])
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'enum', enum: EventLogType })
  type: EventLogType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'user_id', 
    foreignKeyConstraintName: 'fk_event_logs__users__user_id' 
  })
  user?: User;
}
```

---

### 3.4 HomeAssistant-Datenmodell

#### 3.4.1 Entity: `HaSnapshot`

**Tabelle:** `ha_snapshots`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-snapshot.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { HaEntityState } from './ha-entity-state.entity';

export enum SnapshotStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ha_snapshots')
@Index('ix_ha_snapshots__timestamp', ['timestamp'])
@Index('ix_ha_snapshots__import_date', ['importDate'])
@Index('ix_ha_snapshots__status', ['status'])
export class HaSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ length: 100, nullable: true, name: 'ha_version' })
  haVersion?: string;

  @Column({ type: 'timestamp', name: 'import_date' })
  importDate: Date;

  @Column({ type: 'enum', enum: SnapshotStatus, default: SnapshotStatus.PENDING })
  status: SnapshotStatus;

  @Column({ type: 'text', nullable: true, name: 'error_log' })
  errorLog?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => HaEntityState, state => state.snapshot)
  entityStates?: HaEntityState[];
}
```

---

#### 3.4.2 Entity: `HaArea`

**Tabelle:** `ha_areas`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-area.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { HaDevice } from './ha-device.entity';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_areas')
@Index('uq_ha_areas__area_id', ['areaId'], { unique: true })
@Index('ix_ha_areas__name', ['name'])
export class HaArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, name: 'area_id' })
  areaId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  aliases?: string[];

  @Column({ length: 100, nullable: true })
  floor?: string;

  @Column({ length: 100, nullable: true })
  icon?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => HaDevice, device => device.area)
  devices?: HaDevice[];

  @OneToMany(() => HaEntity, entity => entity.area)
  entities?: HaEntity[];
}
```

**Kommentare:**
- `areaId`: Natürlicher Schlüssel aus HA (UNIQUE)
- `id`: Surrogat-PK (UUID)

---

#### 3.4.3 Entity: `HaDevice`

**Tabelle:** `ha_devices`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-device.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { HaArea } from './ha-area.entity';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_devices')
@Index('uq_ha_devices__device_id', ['deviceId'], { unique: true })
@Index('ix_ha_devices__area_id', ['areaId'])
export class HaDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, name: 'device_id' })
  deviceId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  manufacturer?: string;

  @Column({ length: 255, nullable: true })
  model?: string;

  @Column({ length: 100, nullable: true, name: 'sw_version' })
  swVersion?: string;

  @Column({ length: 500, nullable: true, name: 'configuration_url' })
  configurationUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  connections?: any[];

  @Column({ type: 'jsonb', nullable: true })
  identifiers?: any[];

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'via_device_id' })
  viaDeviceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'area_id' })
  areaId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => HaArea, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'area_id', 
    referencedColumnName: 'areaId',
    foreignKeyConstraintName: 'fk_ha_devices__ha_areas__area_id' 
  })
  area?: HaArea;

  @ManyToOne(() => HaDevice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'via_device_id', 
    referencedColumnName: 'deviceId',
    foreignKeyConstraintName: 'fk_ha_devices__ha_devices__via_device_id' 
  })
  viaDevice?: HaDevice;

  @OneToMany(() => HaEntity, entity => entity.device)
  entities?: HaEntity[];
}
```

**Kommentare:**
- `viaDevice`: Self-Referenz (Gateway/Hub-Gerät)
- FKs referenzieren natürliche Schlüssel (`areaId`, `deviceId`)

---

#### 3.4.4 Entity: `HaEntity`

**Tabelle:** `ha_entities`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-entity.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { HaDevice } from './ha-device.entity';
import { HaArea } from './ha-area.entity';
import { HaEntityState } from './ha-entity-state.entity';

export enum EntityType {
  SENSOR = 'sensor',
  BINARY_SENSOR = 'binary_sensor',
  LIGHT = 'light',
  SWITCH = 'switch',
  ZONE = 'zone',
  SCRIPT = 'script',
  INPUT_BOOLEAN = 'input_boolean',
  INPUT_NUMBER = 'input_number',
  INPUT_SELECT = 'input_select',
  PERSON = 'person',
  NUMBER = 'number',
  SELECT = 'select',
  DEVICE_TRACKER = 'device_tracker',
  MEDIA_PLAYER = 'media_player',
  AUTOMATION = 'automation',
}

@Entity('ha_entities')
@Index('uq_ha_entities__entity_id', ['entityId'], { unique: true })
@Index('ix_ha_entities__entity_type', ['entityType'])
@Index('ix_ha_entities__domain', ['domain'])
@Index('ix_ha_entities__device_id', ['deviceId'])
@Index('ix_ha_entities__area_id', ['areaId'])
export class HaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, name: 'entity_id' })
  entityId: string;

  @Column({ type: 'enum', enum: EntityType, name: 'entity_type' })
  entityType: EntityType;

  @Column({ length: 100 })
  domain: string;

  @Column({ length: 255, name: 'object_id' })
  objectId: string;

  @Column({ length: 500, name: 'friendly_name' })
  friendlyName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_id' })
  deviceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'area_id' })
  areaId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => HaDevice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'device_id', 
    referencedColumnName: 'deviceId',
    foreignKeyConstraintName: 'fk_ha_entities__ha_devices__device_id' 
  })
  device?: HaDevice;

  @ManyToOne(() => HaArea, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ 
    name: 'area_id', 
    referencedColumnName: 'areaId',
    foreignKeyConstraintName: 'fk_ha_entities__ha_areas__area_id' 
  })
  area?: HaArea;

  @OneToMany(() => HaEntityState, state => state.entity)
  states?: HaEntityState[];
}
```

---

#### 3.4.5 Entity: `HaEntityState`

**Tabelle:** `ha_entity_states`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-entity-state.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, Index, Unique } from 'typeorm';
import { HaEntity } from './ha-entity.entity';
import { HaSnapshot } from './ha-snapshot.entity';
import { HaEntityAttribute } from './ha-entity-attribute.entity';

@Entity('ha_entity_states')
@Unique('uq_ha_entity_states__entity_snapshot', ['entityId', 'snapshotId'])
@Index('ix_ha_entity_states__entity_id', ['entityId'])
@Index('ix_ha_entity_states__snapshot_id', ['snapshotId'])
@Index('ix_ha_entity_states__last_updated', ['lastUpdated'])
export class HaEntityState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId: string;

  @Column({ type: 'uuid', name: 'snapshot_id' })
  snapshotId: string;

  @Column({ length: 255 })
  state: string;

  @Column({ length: 100, nullable: true, name: 'state_class' })
  stateClass?: string;

  @Column({ type: 'timestamp', name: 'last_changed' })
  lastChanged: Date;

  @Column({ type: 'timestamp', name: 'last_updated' })
  lastUpdated: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => HaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'entity_id', 
    referencedColumnName: 'entityId',
    foreignKeyConstraintName: 'fk_ha_entity_states__ha_entities__entity_id' 
  })
  entity: HaEntity;

  @ManyToOne(() => HaSnapshot, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'snapshot_id', 
    foreignKeyConstraintName: 'fk_ha_entity_states__ha_snapshots__snapshot_id' 
  })
  snapshot: HaSnapshot;

  @OneToMany(() => HaEntityAttribute, attr => attr.entityState)
  attributes?: HaEntityAttribute[];
}
```

**Kommentare:**
- `@Unique`: Kombination `(entityId, snapshotId)` ist eindeutig
- `ON DELETE CASCADE`: Löschen eines Snapshots entfernt alle States

---

#### 3.4.6 Entity: `HaEntityAttribute`

**Tabelle:** `ha_entity_attributes`  
**Datei:** `backend/nest-app/src/modules/homeassistant/entities/ha-entity-attribute.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { HaEntityState } from './ha-entity-state.entity';

export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

@Entity('ha_entity_attributes')
@Index('ix_ha_entity_attributes__attribute_key', ['attributeKey'])
@Index('ix_ha_entity_attributes__entity_state_id', ['entityStateId'])
@Index('ix_ha_entity_attributes__state_key', ['entityStateId', 'attributeKey'])
export class HaEntityAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'entity_state_id' })
  entityStateId: string;

  @Column({ length: 255, name: 'attribute_key' })
  attributeKey: string;

  @Column({ type: 'jsonb', name: 'attribute_value' })
  attributeValue: any;

  @Column({ type: 'enum', enum: AttributeType, name: 'attribute_type' })
  attributeType: AttributeType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => HaEntityState, { onDelete: 'CASCADE' })
  @JoinColumn({ 
    name: 'entity_state_id', 
    foreignKeyConstraintName: 'fk_ha_entity_attributes__ha_entity_states__entity_state_id' 
  })
  entityState: HaEntityState;
}
```

**Kommentare:**
- EAV-Modell für flexible Attribute
- `attributeValue`: JSONB für beliebige Werte
- Zusammengesetzter Index `(entity_state_id, attribute_key)` für schnelle Lookups

---

## 4. Offene Punkte für LUD28-59.2 (Design-Phase)

### 4.1 HA-Erweiterte Entities

Folgende Entities sind in DBM-SCHEMA-01 beschrieben, aber noch nicht gemappt:

- [ ] `ha_services` (Service-Definitionen)
- [ ] `ha_persons` (Personen + Device Tracker)
- [ ] `ha_zones` (Zonen)
- [ ] `ha_zone_persons` (M:N Zonen ↔ Personen)
- [ ] `ha_media_players` (Media Player)
- [ ] `ha_media_player_group_members` (Self M:N)
- [ ] `ha_automations` (Automationen)

### 4.2 Dimensionstabellen

- [ ] `user_roles` (Rollen-Definitionen)
- [ ] `user_permissions` (Permissions-Definitionen)
- [ ] `llm_instances` (LLM-Konfigurationen)

### 4.3 Datentyp-Entscheidungen

Folgende Typen müssen für MariaDB angepasst werden (wenn nicht PostgreSQL):

| PostgreSQL | MariaDB |
|-----------|---------|
| `UUID` | `CHAR(36)` oder `BINARY(16)` |
| `JSONB` | `JSON` (oder `TEXT` + Validation) |
| `TIMESTAMP` | `DATETIME` |

**→ Wird in DBM-SCHEMA-05 finalisiert**

### 4.4 Performance-Optimierungen

- [ ] Zusammengesetzte Indizes evaluieren (z.B. `(user_id, created_at)` für Transcripts)
- [ ] Partitionierung für große Tabellen (`ha_entity_states`, `ha_entity_attributes`)
- [ ] Materialized Views für HA-Statistiken

---

## 5. Migrations-Hinweise (für LUD28-59.4)

### 5.1 TypeORM CLI

Migrations generieren:

```bash
npm run typeorm -- migration:generate -n CreateCoreEntities
```

### 5.2 Constraint-Namen manuell setzen

TypeORM-generierte Migrations verwenden oft generische Namen. **Manuelle Anpassung erforderlich:**

```typescript
// Beispiel: User → UserRights FK
await queryRunner.createForeignKey('user_rights', new TableForeignKey({
  name: 'fk_user_rights__users__user_id', // ← manuell gesetzt
  columnNames: ['user_id'],
  referencedTableName: 'users',
  referencedColumnNames: ['id'],
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
}));
```

### 5.3 Index-Erstellung

```typescript
await queryRunner.createIndex('speech_transcripts', new TableIndex({
  name: 'ix_speech_transcripts__created_at',
  columnNames: ['created_at'],
}));
```

---

## 6. Akzeptanzkriterien (AC) – Status

- [x] **AC1:** Alle PoC-Entities (Priorität 1-4) haben vollständige TypeORM-Definitionen
- [x] **AC2:** FK-Constraint-Namen folgen Konventionen aus DBM-SCHEMA-02
- [x] **AC3:** Indizes auf PKs, FKs und typischen Suchspalten definiert
- [x] **AC4:** Offene Punkte für Phase 2 (Full Scope) dokumentiert
- [ ] **AC5:** Design-Review durch @backend-team (→ LUD28-59.2)

---

## 7. Nächste Schritte

1. ✅ **Draft-Review** mit Team (diese Datei)
2. ⏳ **Finalisierung in LUD28-59.2** (Design-Phase)
   - Ergänzung fehlender Entities (HA-erweitert)
   - Entscheidung Datenbank (PostgreSQL vs. MariaDB)
   - Finalisierung offener Typen
3. ⏳ **Start LUD28-59.3** (Implementation)
   - Erstellen der `.entity.ts`-Dateien
   - TypeScript-Kompilierung
4. ⏳ **Start LUD28-59.4** (Migrations)

---

**Status:** 🔶 Draft (Review Required)  
**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03  
**Autor:** GitHub Copilot (AI Agent)

