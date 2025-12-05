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
import { Keyword } from './keyword.entity';

/**
 * TranscriptKeyword Entity
 *
 * Join-Table für M:N-Beziehung zwischen Transcript und Keyword.
 * Speichert optionale Position für Array-Reihenfolge.
 *
 * @see database/DBM-SCHEMA-04-Join-Tabellen-und-Many-to-Many-Relationen.md
 */
@Entity('transcript_keywords')
@Index('ix_transcript_keywords__keyword_id', ['keywordId'])
export class TranscriptKeyword {
  /**
   * Composite Primary Key: transcript_id
   */
  @PrimaryColumn('uuid', { name: 'transcript_id' })
  transcriptId: string;

  /**
   * Composite Primary Key: keyword_id
   */
  @PrimaryColumn('uuid', { name: 'keyword_id' })
  keywordId: string;

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
  @ManyToOne(() => TranscriptEntity, (transcript) => transcript.transcriptKeywords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'transcript_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_transcript_keywords__transcripts',
  })
  transcript: TranscriptEntity;

  /**
   * Relation zu Keyword
   * ON DELETE CASCADE
   */
  @ManyToOne(() => Keyword, (keyword) => keyword.transcripts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'keyword_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_transcript_keywords__keywords',
  })
  keyword: Keyword;
}

