import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { IntentLog } from './intent-log.entity';
import { Keyword } from './keyword.entity';

/**
 * IntentLogKeyword Entity
 *
 * Join-Table für M:N-Beziehung zwischen IntentLog und Keyword.
 * Speichert optionale Position für Array-Reihenfolge.
 *
 * @see database/DBM-SCHEMA-04-Join-Tabellen-und-Many-to-Many-Relationen.md
 */
@Entity('intent_log_keywords')
@Index('ix_intent_log_keywords__keyword_id', ['keywordId'])
export class IntentLogKeyword {
  /**
   * Composite Primary Key: intent_log_id
   */
  @PrimaryColumn('uuid', { name: 'intent_log_id' })
  intentLogId: string;

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
   * Relation zu IntentLog
   * ON DELETE CASCADE
   */
  @ManyToOne(() => IntentLog, (intentLog) => intentLog.intentLogKeywords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'intent_log_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_intent_log_keywords__intent_logs',
  })
  intentLog: IntentLog;

  /**
   * Relation zu Keyword
   * ON DELETE CASCADE
   */
  @ManyToOne(() => Keyword, (keyword) => keyword.intentLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'keyword_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_intent_log_keywords__keywords',
  })
  keyword: Keyword;
}

