import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { EventLogType } from '../enums';

/**
 * EventLog Entity
 *
 * Allgemeine Event-Logs für System-Events, WebSocket-Events, etc.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('event_logs')
@Index('ix_event_logs__timestamp', ['timestamp'])
@Index('ix_event_logs__type', ['type'])
@Index('ix_event_logs__user_id', ['userId'])
export class EventLog {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Zeitstempel des Events
   */
  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  /**
   * Event-Typ
   */
  @Column({
    type: 'enum',
    enum: EventLogType,
    default: EventLogType.INFO,
    name: 'type',
  })
  type: EventLogType;

  /**
   * Event-Message
   */
  @Column({ type: 'text', name: 'message' })
  message: string;

  /**
   * Optional: Benutzer-ID (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Zusätzliche Event-Details als JSON
   */
  @Column({ type: 'json', nullable: true, name: 'details' })
  details: Record<string, any> | null;

  /**
   * Erstellungszeitpunkt
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation zu User
   * ON DELETE SET NULL: Log bleibt erhalten, wenn User gelöscht wird
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_event_logs__users__user_id',
  })
  user: User | null;
}

