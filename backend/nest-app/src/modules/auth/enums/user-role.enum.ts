/**
}

/**
 * @see database/entities-spec/auth/user-rights.entity.spec.md
 *
 * Definiert die verfügbaren Benutzerrollen.
 *
 * User Role Enum
*/
export enum UserRole {
  /** Terminal-spezifische Rechte */
  TERMINAL = 'terminal',
  /** Eingeschränkter Zugriff */
  GUEST = 'guest',
  /** Standard-Benutzer mit grundlegenden Rechten */
  REGULAR = 'regular',
  /** Terminal-/User-Verwaltung */
  MANAGER = 'manager',
  /** Voller Zugriff auf alle Funktionen */
  ADMIN = 'admin',
}
