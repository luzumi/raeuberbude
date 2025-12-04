import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Category Entity
 *
 * Central categorization for logs, transcripts and intents.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('categories')
@Index('uq_categories__key', ['key'], { unique: true })
export class Category {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Category Key (UNIQUE, e.g. 'home_assistant_command', 'system_query')
   */
  @Column({ type: 'varchar', length: 100, unique: true, name: 'key' })
  key: string;

  /**
   * User-friendly Label
   */
  @Column({ type: 'varchar', length: 255, name: 'label' })
  label: string;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string | null;

  /**
   * Creation Timestamp
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  // Relations to IntentLog and SpeechTranscript will be added in later phases
  // - intentLogs: IntentLog[] (1:n)
  // - transcripts: SpeechTranscript[] (1:n)
}

