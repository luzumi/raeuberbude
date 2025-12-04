/**
 *
 * @see database/entities-spec/terminals/app-terminal.entity.spec.md
 *
 * Available terminal types.
 *
 * Terminal Type Enum
 */
export enum TerminalType {
  /** Other */
  OTHER = 'other',
  /** Smart TV / Fire TV */
  SMART_TV = 'smart-tv',
  /** Kiosk Mode (Fullscreen) */
  KIOSK = 'kiosk',
  /** Tablet */
  TABLET = 'tablet',
  /** Smartphone */
  MOBILE = 'mobile',
  /* Desktop/Laptop Browser */
  BROWSER = 'browser',
}
