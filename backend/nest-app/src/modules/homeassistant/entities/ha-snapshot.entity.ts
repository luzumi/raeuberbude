import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { HaEntityState } from './ha-entity-state.entity';

export enum SnapshotStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('ha_snapshots')
export class HaSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'ha_version' })
  haVersion: string;

  @CreateDateColumn({ name: 'import_date' })
  importDate: Date;

  @Column({
    type: 'enum',
    enum: SnapshotStatus,
    default: SnapshotStatus.PENDING
  })
  status: SnapshotStatus;

  @Column({ name: 'error_log', type: 'text', nullable: true })
  errorLog: string;

  @OneToMany(() => HaEntityState, state => state.snapshot)
  entityStates: HaEntityState[];
}
