# Entity Spec: `User`
**Freigegeben für:** LUD28-59.3 (Entity-Implementierung)
**Review:** 2025-12-03  
**Status:** ✅ Spezifikation finalisiert  

---

- [ ] **Multi-Tenancy:** Zukünftig `organizationId`? (Phase 2)
- [ ] **Email-Verifizierung:** Extra Spalte `emailVerified`? (Zunächst nicht)
- [ ] **Soft-Delete:** Brauchen wir `deletedAt`-Spalte? (DSGVO: Echte Löschung bevorzugt)

## 8. Offene Fragen

---

```
);
  NOW()
  NOW(),
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin@localhost',
  'admin',
  uuid_generate_v4(),
VALUES (
INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
-- Default Admin-User (Passwort: admin123)
```sql

### 7.2 Seed-Daten

- `profile` → `profileData` (JSONB)
- `password` → `passwordHash`
- `_id` → `id` (UUID generieren)
**Mapping:**

```
}
  updatedAt: Date
  createdAt: Date,
  profile: Object, // entspricht profileData
  password: String, // direkt Hash
  email: String,
  username: String,
  _id: ObjectId,
{
// Mongo (Mongoose)


**Quell-Schema:** `backend/nest-app/src/users/schemas/user.schema.ts`

### 7.1 Mongo → MariaDB Mapping

## 7. Migration Notes

---


}
  updatedAt: "2024-12-01T14:20:00Z"
  createdAt: "2024-01-15T10:30:00Z",
  },
    theme: "dark"
    avatar: "/assets/avatars/admin.png",
    lastName: "Mustermann",
    firstName: "Max",
  profileData: {
  passwordHash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  email: "admin@example.com",
  username: "admin",
  id: "550e8400-e29b-41d4-a716-446655440000",
{

## 6. Beispiel-Daten

---

- `passwordHash`: Mindestens 60 Zeichen (bcrypt-Standard)
- `email`: Valide E-Mail-Syntax (via Application + UNIQUE)
- `username`: Länge 3-100 Zeichen (via Application)

### 5.2 Database-Level
}
  password: string; // Wird zu passwordHash
  @MinLength(8)
  @IsString()

  email: string;
  @Length(5, 255)
  @IsEmail()

  username: string;
  @Length(3, 100)
  @IsString()
export class CreateUserDto {
// In user.dto.ts

### 5.1 Application-Level (TypeORM/NestJS)

## 5. Validierungsregeln

---

- `username`, `email`: Automatisch via UNIQUE
- `created_at`: Zeitreihen-Queries (z.B. neue User/Monat)
**Rationale:**

```
CREATE INDEX ix_users__created_at ON users(created_at);
```sql
### 4.3 Indizes

CONSTRAINT uq_users__email UNIQUE (email)
CONSTRAINT uq_users__username UNIQUE (username)
```sql
### 4.2 Unique Constraints

```
CONSTRAINT pk_users PRIMARY KEY (id)
```sql
### 4.1 Primärschlüssel

## 4. Constraints & Indizes

---

| `assignedTerminals` | `1:n` | `AppTerminal` | `assigned_user_id` | `SET NULL` | `CASCADE` |
| `haPerson` | `1:1` | `HaPerson` | `user_id` | `SET NULL` | `CASCADE` |
| `allowedTerminals` | `m:n` | `AppTerminal` | via `user_allowed_terminals` | `CASCADE` | `CASCADE` |
| `eventLogs` | `1:n` | `EventLog` | `user_id` | `SET NULL` | `CASCADE` |
| `testInputs` | `1:n` | `SpeechTestInput` | `user_id` | `SET NULL` | `CASCADE` |
| `transcripts` | `1:n` | `SpeechTranscript` | `user_id` | `SET NULL` | `CASCADE` |
| `speechInputs` | `1:n` | `SpeechHumanInput` | `user_id` | `SET NULL` | `CASCADE` |
| `userRights` | `1:1` | `UserRights` | `user_id` | `CASCADE` | `CASCADE` |
|----------|-----|---------------|-----------|-----------|-----------|
| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |

### 3.2 Eingehende Relationen (andere Tabellen verweisen auf User)

Keine (User hat keine FKs zu anderen Tabellen).

### 3.1 Ausgehende Relationen (Foreign Keys in dieser Tabelle)

## 3. Relationen

---

| `updatedAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Letztes Update |
| `createdAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Erstellungszeitpunkt |
| `profileData` | `Record<string, any>` | `JSONB` | ✅ | `null` | Flexible Zusatzinfos (Name, Avatar, etc.) |
| `passwordHash` | `string` | `VARCHAR(255)` | ❌ | – | bcrypt/argon2-Hash |
| `email` | `string` | `VARCHAR(255)` | ❌ | – | E-Mail (UNIQUE, lowercase) |
| `username` | `string` | `VARCHAR(100)` | ❌ | – | Login-Name (UNIQUE) |
| `id` | `string` | `UUID` | ❌ | PK | Primärschlüssel (Surrogat) |
|--------|----------------|--------|----------|---------|-----------|
| Spalte | TypeScript-Typ | DB-Typ | Nullable | Default | Kommentar |

## 2. Felder

---

- Verknüpfung mit HomeAssistant-Personen
- Referenz für Spracheingaben, Logs, Transcripts
- Benutzerverwaltung (Login, Profile)
**Zweck:**

Zentrale Benutzerentität für App-Authentifizierung und Autorisierung.

## 1. Übersicht

---

**Ticket:** LUD28-107 (LUD28-59.2)
**Modul:** `backend/nest-app/src/modules/users/entities/user.entity.ts`  
**Tabelle:** `users`  


