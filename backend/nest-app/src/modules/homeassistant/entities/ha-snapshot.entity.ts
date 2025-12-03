import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SnapshotStatus } from '../enums';

/**
 * HaSnapshot Entity
 *
 * Represents a HomeAssistant state snapshot import.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_snapshots')
@Index('ix_ha_snapshots__timestamp', ['timestamp'])
@Index('ix_ha_snapshots__import_date', ['importDate'])
@Index('ix_ha_snapshots__status', ['status'])
export class HaSnapshot {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Snapshot timestamp from HomeAssistant
   */
  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  /**
   * HomeAssistant version
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ha_version' })
  haVersion: string | null;

  /**
   * Import date/time
   */
  @Column({ type: 'timestamp', name: 'import_date' })
  importDate: Date;

  /**
   * Import status
   */
  @Column({
    type: 'enum',
    enum: SnapshotStatus,
    default: SnapshotStatus.PENDING,
    name: 'status',
  })
  status: SnapshotStatus;

  /**
   * Error log (if import failed)
   */
  @Column({ type: 'text', nullable: true, name: 'error_log' })
  errorLog: string | null;

  /**
   * Creation Timestamp
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  // Relations to HaEntityState will be added after that entity is created
  // - entityStates: HaEntityState[] (1:n)
}

