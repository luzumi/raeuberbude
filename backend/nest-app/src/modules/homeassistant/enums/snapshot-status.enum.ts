/**
 *
 * Status of a HomeAssistant snapshot import.
 *
 * Snapshot Status Enum
 */
export enum SnapshotStatus {
  /** Import completed successfully */
  COMPLETED = 'completed',
  /** Currently processing */
  PROCESSING = 'processing',
  /** Import pending */
  PENDING = 'pending',
  /** Import failed */
  FAILED = 'failed',
}
