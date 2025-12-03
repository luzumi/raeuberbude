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
import { AppTerminal } from '../../terminals/entities';

/**
 * SpeechHumanInput Entity
 *
 * Stores human speech inputs from various terminals.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('speech_human_inputs')
@Index('ix_speech_human_inputs__created_at', ['createdAt'])
@Index('ix_speech_human_inputs__user_id', ['userId'])
@Index('ix_speech_human_inputs__terminal_id', ['terminalId'])
export class SpeechHumanInput {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Optional: User ID (Foreign Key)
   * SET NULL on user deletion (pseudonymization)
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Optional: Terminal ID (Foreign Key)
   * SET NULL on terminal deletion
   */
  @Column({ type: 'uuid', nullable: true, name: 'terminal_id' })
  terminalId: string | null;

  /**
   * Transcribed Text
   */
  @Column({ type: 'text', name: 'text' })
  text: string;

  /**
   * Language (e.g. 'de-DE', 'en-US')
   */
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'language' })
  language: string | null;

  /**
   * Speech Recognition Confidence (0.0 - 1.0)
   */
  @Column({ type: 'float', nullable: true, name: 'confidence' })
  confidence: number | null;

  /**
   * Additional Metadata (Audio metadata, Session ID, etc.)
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
   * ON DELETE SET NULL: Input remains when user is deleted
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_human_inputs__users__user_id',
  })
  user: User | null;

  /**
   * n:1 Relation to AppTerminal
   * ON DELETE SET NULL: Input remains when terminal is deleted
   */
  @ManyToOne(() => AppTerminal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'terminal_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_human_inputs__app_terminals__terminal_id',
  })
  terminal: AppTerminal | null;
}

