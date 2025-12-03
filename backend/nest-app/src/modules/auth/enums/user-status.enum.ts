/**
 * User Status Enum
 *
 * Definiert den Status eines Benutzers.
 *
 * @see database/entities-spec/auth/user-rights.entity.spec.md
 */
export enum UserStatus {
  /** Aktiver Benutzer */
  ACTIVE = 'active',

  /** Temporär deaktiviert */
  SUSPENDED = 'suspended',

  /** Dauerhaft gesperrt */
  REVOKED = 'revoked',
}

