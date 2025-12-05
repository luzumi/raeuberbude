import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { TranscriptEntity } from './transcript.entity';

/**
 * Suggestion Entity
 *
 * Verwaltung aller LLM-generierten Vorschläge.
 * Deduplizierung via SHA256-Hash für Analytics.
 *
 * @see database/DBM-SCHEMA-04-Join-Tabellen-und-Many-to-Many-Relationen.md
 */
@Entity('suggestions')
@Index('ix_suggestions__text_hash', ['textHash'])
@Index('ix_suggestions__usage_count', ['usageCount'])
export class Suggestion {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Vorschlagstext
   */
  @Column({ type: 'text', name: 'suggestion_text' })
  suggestionText: string;

  /**
   * SHA256-Hash für Deduplizierung (UNIQUE)
   */
  @Column({ type: 'char', length: 64, unique: true, name: 'text_hash' })
  textHash: string;

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
  @ManyToMany(() => TranscriptEntity, (transcript) => transcript.suggestions)
  transcripts: TranscriptEntity[];
}

