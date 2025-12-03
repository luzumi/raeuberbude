import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities';

/**
 * HaPerson Entity
 *
 * Represents a HomeAssistant person and links to User.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_persons')
@Index('uq_ha_persons__person_id', ['personId'], { unique: true })
@Index('ix_ha_persons__user_id', ['userId'])
export class HaPerson {
  /**
   * Surrogate Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Natural Key from HomeAssistant (UNIQUE, e.g. 'person.john_doe')
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'person_id' })
  personId: string;

  /**
   * Person Name
   */
  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  /**
   * Optional: Linked User ID (Foreign Key to users.id)
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Picture URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'picture' })
  picture: string | null;

  /**
   * Device Trackers (JSON array of entity_ids)
   */
  @Column({ type: 'json', nullable: true, name: 'device_trackers' })
  deviceTrackers: string[] | null;

  /**
   * Additional metadata
   */
  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

  /**
   * Creation Timestamp
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * Last Update
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation to User
   * ON DELETE SET NULL: Person remains when user is deleted
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_ha_persons__users__user_id',
  })
  user: User | null;
}

