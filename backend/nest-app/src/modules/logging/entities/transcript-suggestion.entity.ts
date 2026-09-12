import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TranscriptEntity } from './transcript.entity';
import { Suggestion } from './suggestion.entity';

/**
 * TranscriptSuggestion Entity
 *
 * Join-Table für M:N-Beziehung zwischen Transcript und Suggestion.
 * Speichert optionale Position für Array-Reihenfolge.
 *
 * @see database/DBM-SCHEMA-04-Join-Tabellen-und-Many-to-Many-Relationen.md
 */
@Entity('transcript_suggestions')
@Index('ix_transcript_suggestions__suggestion_id', ['suggestionId'])
export class TranscriptSuggestion {
  /**
   * Composite Primary Key: transcript_id
   */
  @PrimaryColumn('uuid', { name: 'transcript_id' })
  transcriptId: string;

  /**
   * Composite Primary Key: suggestion_id
   */
  @PrimaryColumn('uuid', { name: 'suggestion_id' })
  suggestionId: string;

  /**
   * Optional: Position im Original-Array (für Reihenfolge)
   */
  @Column({ type: 'int', nullable: true, name: 'position' })
  position: number | null;

  /**
   * Erstellungszeitpunkt
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * Relation zu Transcript
   * ON DELETE CASCADE
   */
  @ManyToOne(() => TranscriptEntity, (transcript) => transcript.transcriptSuggestions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'transcript_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_transcript_suggestions__transcripts',
  })
  transcript: TranscriptEntity;

  /**
   * Relation zu Suggestion
   * ON DELETE CASCADE
   */
  @ManyToOne(() => Suggestion, (suggestion) => suggestion.transcripts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'suggestion_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_transcript_suggestions__suggestions',
  })
  suggestion: Suggestion;
}

