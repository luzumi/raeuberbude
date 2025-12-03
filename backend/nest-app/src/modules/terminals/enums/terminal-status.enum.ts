/**
 * Terminal Status Enum
 *
 * Definiert den Status eines Terminals.
 *
 * @see database/entities-spec/terminals/app-terminal.entity.spec.md
 */
export enum TerminalStatus {
  /** Aktiv und einsatzbereit */
  ACTIVE = 'active',

  /** Temporär inaktiv */
  INACTIVE = 'inactive',

  /** In Wartung/Konfiguration */
  MAINTENANCE = 'maintenance',
}

