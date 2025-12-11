# Entity Spec: `UserRights`

**Tabelle:** `user_rights`  
**Modul:** `backend/nest-app/src/modules/users/entities/user-rights.entity.ts`  
**Ticket:** LUD28-107 (LUD28-59.2)

---

## 1. Übersicht

1:1-Erweiterung zu `User` für Rollen und Berechtigungen.

**Zweck:**
- Trennung von Authentifizierung (User) und Autorisierung (Rights)
- Feingranulare Berechtigungen
- Rollen-basiertes Rechtemanagement

---

## 2. Felder

| Spalte | TypeScript-Typ | DB-Typ | Nullable | Default | Kommentar |
|--------|----------------|--------|----------|---------|-----------|
| `userId` | `string` | `UUID` | ❌ | PK + FK | PK = FK zu `users.id` |
| `role` | `UserRole` | `ENUM` | ❌ | `'regular'` | Rolle (admin, manager, regular, guest, terminal) |
| `status` | `UserStatus` | `ENUM` | ❌ | `'active'` | Status (active, suspended, revoked) |
| `expiresAt` | `Date` | `TIMESTAMP` | ✅ | `null` | Optionales Ablaufdatum |
| `permissionsJson` | `string[]` | `JSONB` | ✅ | `null` | Custom Permissions (z.B. `['read:transcripts', 'write:terminals']`) |
| `canUseSpeechInput` | `boolean` | `BOOLEAN` | ❌ | `true` | Spracheingabe erlaubt |
| `canViewOwnInputs` | `boolean` | `BOOLEAN` | ❌ | `true` | Eigene Eingaben anzeigen |
| `canViewAllInputs` | `boolean` | `BOOLEAN` | ❌ | `false` | Alle Eingaben anzeigen |
| `canDeleteInputs` | `boolean` | `BOOLEAN` | ❌ | `false` | Eingaben löschen |
| `canManageTerminals` | `boolean` | `BOOLEAN` | ❌ | `false` | Terminal-Verwaltung |
| `canManageUsers` | `boolean` | `BOOLEAN` | ❌ | `false` | Benutzer-Verwaltung |
| `metadata` | `Record<string, any>` | `JSONB` | ✅ | `null` | Zusätzliche Metadaten |
| `createdAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Erstellung |
| `updatedAt` | `Date` | `TIMESTAMP` | ❌ | `NOW()` | Letztes Update |

---

## 3. Enums

### 3.1 `UserRole`

```typescript
export enum UserRole {
  ADMIN = 'admin',       // Voller Zugriff
  MANAGER = 'manager',   // Terminal-/User-Verwaltung
  REGULAR = 'regular',   // Standard-Benutzer
  GUEST = 'guest',       // Eingeschränkter Zugriff
  TERMINAL = 'terminal', // Terminal-spezifische Rechte
}
```

### 3.2 `UserStatus`

```typescript
export enum UserStatus {
  ACTIVE = 'active',       // Aktiv
  SUSPENDED = 'suspended', // Temporär deaktiviert
  REVOKED = 'revoked',     // Dauerhaft gesperrt
}
```

---

## 4. Relationen

### 4.1 Ausgehende Relationen (Foreign Keys in dieser Tabelle)

| Relation | Typ | Target Entity | FK-Spalte | ON DELETE | ON UPDATE |
|----------|-----|---------------|-----------|-----------|-----------|
| `user` | `1:1` | `User` | `user_id` | `CASCADE` | `CASCADE` |

### 4.2 Eingehende Relationen

| Relation | Typ | Target Entity | Via | Kommentar |
|----------|-----|---------------|-----|-----------|
| `allowedTerminals` | `m:n` | `AppTerminal` | `user_allowed_terminals` | Erlaubte Terminals für diesen User |

---

## 5. Constraints & Indizes

### 5.1 Primärschlüssel
```sql
CONSTRAINT pk_user_rights PRIMARY KEY (user_id)
```

### 5.2 Foreign Keys
```sql
CONSTRAINT fk_user_rights__users__user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE
```

### 5.3 Indizes
```sql
CREATE INDEX ix_user_rights__role ON user_rights(role);
CREATE INDEX ix_user_rights__status ON user_rights(status);
```

**Rationale:**
- `role`: Häufige Filterung (z.B. alle Admins)
- `status`: Abfragen aktiver/suspendierter User

---

## 6. Rollen-Matrix

| Berechtigung | admin | manager | regular | guest | terminal |
|-------------|-------|---------|---------|-------|----------|
| `canUseSpeechInput` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canViewOwnInputs` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canViewAllInputs` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canDeleteInputs` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageTerminals` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageUsers` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Beispiel-Daten

### 7.1 Admin-User Rights

```typescript
{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  expiresAt: null,
  permissionsJson: ["*"], // Wildcard für alle Permissions
  canUseSpeechInput: true,
  canViewOwnInputs: true,
  canViewAllInputs: true,
  canDeleteInputs: true,
  canManageTerminals: true,
  canManageUsers: true,
  metadata: {
    grantedBy: "system",
    reason: "Initial setup"
  },
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### 7.2 Regular User Rights

```typescript
{
  userId: "660e8400-e29b-41d4-a716-446655440001",
  role: UserRole.REGULAR,
  status: UserStatus.ACTIVE,
  expiresAt: null,
  permissionsJson: null,
  canUseSpeechInput: true,
  canViewOwnInputs: true,
  canViewAllInputs: false,
  canDeleteInputs: false,
  canManageTerminals: false,
  canManageUsers: false,
  metadata: null,
  createdAt: "2024-06-10T14:20:00Z",
  updatedAt: "2024-06-10T14:20:00Z"
}
```

---

## 8. Migration Notes

### 8.1 Mongo → MariaDB Mapping

**Quell-Schema:** Embedded in `User` Schema

```typescript
// Mongo (nested in User)
{
  rights: {
    role: 'admin',
    canUseSpeechInput: true,
    // ...
  }
}
```

**Mapping:**
- Extrahiere `rights`-Objekt in separate Tabelle
- `user._id` → `user_rights.user_id`

### 8.2 Default Rights bei User-Erstellung

```typescript
// In UserService.create()
async createUser(dto: CreateUserDto): Promise<User> {
  const user = await this.usersRepo.save({ ...dto });
  
  // Auto-create UserRights
  await this.userRightsRepo.save({
    userId: user.id,
    role: UserRole.REGULAR,
    status: UserStatus.ACTIVE,
    canUseSpeechInput: true,
    canViewOwnInputs: true,
    // alle anderen defaults...
  });
  
  return user;
}
```

---

## 9. Offene Fragen

- [ ] **Permission-System:** Brauchen wir separate `permissions`-Tabelle? (Zunächst JSONB)
- [ ] **Role-Hierarchie:** Implementierung von Rollen-Vererbung? (Phase 2)
- [ ] **Audit-Log:** Rechte-Änderungen tracken? (Separate `user_rights_history`-Tabelle?)

---

**Status:** ✅ Spezifikation finalisiert  
**Review:** 2025-12-03  
**Freigegeben für:** LUD28-59.3 (Entity-Implementierung)

