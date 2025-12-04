/**
 * Event Log Type Enum
 *
 * Definiert die verfügbaren Event-Log-Typen.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
export enum EventLogType {
  /** WebSocket-Events */
  WEBSOCKET = 'websocket',

  /** Benutzer-Aktionen */
  ACTION = 'action',

  /** Fehler */
  ERROR = 'error',

  /** Informationen */
  INFO = 'info',

  /** Debug-Informationen */
  DEBUG = 'debug',
}

