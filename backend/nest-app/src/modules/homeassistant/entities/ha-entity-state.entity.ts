import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HaEntity } from './ha-entity.entity';
import { HaSnapshot } from './ha-snapshot.entity';

/**
 * HaEntityState Entity
 *
 * Stores entity state history (time-series data).
 * Designed for table partitioning by timestamp.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_entity_states')
@Index('ix_ha_entity_states__entity_id', ['entityId'])
@Index('ix_ha_entity_states__timestamp', ['timestamp'])
@Index('ix_ha_entity_states__snapshot_id', ['snapshotId'])
@Index('ix_ha_entity_states__entity_timestamp', ['entityId', 'timestamp'])
export class HaEntityState {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Entity ID (Foreign Key to ha_entities.entity_id)
   */
  @Column({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId: string;

  /**
   * State value (stored as string, e.g. 'on', 'off', '23.5')
   */
  @Column({ type: 'text', name: 'state' })
  state: string;

  /**
   * Timestamp of the state
   */
  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  /**
   * Optional: Snapshot ID (if from a snapshot import)
   */
  @Column({ type: 'uuid', nullable: true, name: 'snapshot_id' })
  snapshotId: string | null;

  /**
   * Last changed timestamp
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_changed' })
  lastChanged: Date | null;

  /**
   * Last updated timestamp
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_updated' })
  lastUpdated: Date | null;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation to HaEntity
   * ON DELETE CASCADE: State is deleted when entity is deleted
   */
  @ManyToOne(() => HaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'entity_id',
    referencedColumnName: 'entityId',
    foreignKeyConstraintName: 'fk_ha_entity_states__ha_entities__entity_id',
  })
  entity: HaEntity;

  /**
   * n:1 Relation to HaSnapshot
   * ON DELETE SET NULL: State remains when snapshot is deleted
   */
  @ManyToOne(() => HaSnapshot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'snapshot_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_ha_entity_states__ha_snapshots__snapshot_id',
  })
  snapshot: HaSnapshot | null;
}

