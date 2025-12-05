import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { TranscriptEntity } from './transcript.entity';
import { IntentLog } from './intent-log.entity';

/**
 * Keyword Entity
 *
 * Zentrale Verwaltung aller Keywords/Tags im System.
 * Ermöglicht Deduplizierung und Analytics über Keyword-Nutzung.
 *
 * @see database/DBM-SCHEMA-04-Join-Tabellen-und-Many-to-Many-Relationen.md
 */
@Entity('keywords')
@Index('ix_keywords__normalized', ['normalized'])
@Index('ix_keywords__usage_count', ['usageCount'])
export class Keyword {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Original Keyword Text (UNIQUE)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  keyword: string;

  /**
   * Normalisierte Form (lowercase) für Case-Insensitive Suche
   */
  @Column({ type: 'varchar', length: 100, name: 'normalized' })
  normalized: string;

  /**
   * Anzahl der Verwendungen (für Analytics/Ranking)
   */
  @Column({ type: 'int', default: 0, name: 'usage_count' })
  usageCount: number;

  /**
   * Erstellungszeitpunkt
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * M:N Relation zu Transcripts
   */
  @ManyToMany(() => TranscriptEntity, (transcript) => transcript.keywords)
  transcripts: TranscriptEntity[];

  /**
   * M:N Relation zu IntentLogs
   */
  @ManyToMany(() => IntentLog, (intentLog) => intentLog.keywords)
  intentLogs: IntentLog[];
}

