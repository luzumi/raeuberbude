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
import { Category } from './category.entity';

/**
 * SpeechTranscript Entity
 *
 * Stores processed speech transcripts with intent and context information.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('speech_transcripts')
@Index('ix_speech_transcripts__created_at', ['createdAt'])
@Index('ix_speech_transcripts__user_id', ['userId'])
@Index('ix_speech_transcripts__terminal_id', ['terminalId'])
@Index('ix_speech_transcripts__category_id', ['categoryId'])
@Index('ix_speech_transcripts__assigned_area_id', ['assignedAreaId'])
@Index('ix_speech_transcripts__assigned_entity_id', ['assignedEntityId'])
export class SpeechTranscript {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Optional: User ID (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Optional: Terminal ID (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'terminal_id' })
  terminalId: string | null;

  /**
   * Optional: Category ID (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId: string | null;

  /**
   * Transcript text
   */
  @Column({ type: 'text', name: 'transcript' })
  transcript: string;

  /**
   * Recognized intent
   */
  @Column({ type: 'text', nullable: true, name: 'recognized_intent' })
  recognizedIntent: string | null;

  /**
   * Confidence score (0.0 - 1.0)
   */
  @Column({ type: 'float', nullable: true, name: 'confidence' })
  confidence: number | null;

  /**
   * Optional: Assigned HomeAssistant Area ID (natural key)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_area_id' })
  assignedAreaId: string | null;

  /**
   * Optional: Assigned HomeAssistant Entity ID (natural key)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_entity_id' })
  assignedEntityId: string | null;

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
   * ON DELETE SET NULL: Transcript remains when user is deleted
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_transcripts__users__user_id',
  })
  user: User | null;

  /**
   * n:1 Relation to AppTerminal
   * ON DELETE SET NULL: Transcript remains when terminal is deleted
   */
  @ManyToOne(() => AppTerminal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'terminal_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_transcripts__app_terminals__terminal_id',
  })
  terminal: AppTerminal | null;

  /**
   * n:1 Relation to Category
   * ON DELETE SET NULL: Transcript remains when category is deleted
   */
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'category_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_transcripts__categories__category_id',
  })
  category: Category | null;

  // Relations to HomeAssistant entities will be added in Phase 3:
  // - assignedArea: HaArea (n:1)
  // - assignedEntity: HaEntity (n:1)
}

