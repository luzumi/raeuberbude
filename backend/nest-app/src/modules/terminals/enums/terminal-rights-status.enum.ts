/**
 * Terminal Rights Status Enum
 *
 * Definiert den Status der Terminal-Berechtigungen.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
export enum TerminalRightsStatus {
  /** Aktiv und einsatzbereit */
  ACTIVE = 'active',

  /** Temporär suspendiert */
  SUSPENDED = 'suspended',

  /** In Wartung/Konfiguration */
  MAINTENANCE = 'maintenance',
}

