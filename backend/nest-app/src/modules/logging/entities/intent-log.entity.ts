import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { Category } from './category.entity';
import { AppTerminal } from '../../terminals/entities';
import { Keyword } from './keyword.entity';
import { IntentLogKeyword } from './intent-log-keyword.entity';

/**
 * IntentLog Entity
 *
 * Logs recognized intents from speech inputs.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('intent_logs')
@Index('ix_intent_logs__timestamp', ['timestamp'])
@Index('ix_intent_logs__category_id', ['categoryId'])
@Index('ix_intent_logs__terminal_id', ['terminalId'])
export class IntentLog {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Timestamp of the intent recognition
   */
  @Column({ type: 'timestamp', name: 'timestamp' })
  timestamp: Date;

  /**
   * Transcript text
   */
  @Column({ type: 'text', name: 'transcript' })
  transcript: string;

  /**
   * Intent Key (e.g. 'turn_on_light', 'query_weather')
   */
  @Column({ type: 'varchar', length: 255, name: 'intent_key' })
  intentKey: string;

  /**
   * Summary of the intent
   */
  @Column({ type: 'text', nullable: true, name: 'summary' })
  summary: string | null;

  /**
   * Extracted keywords as JSON array
   */
  @Column({ type: 'json', nullable: true, name: 'keywords_json' })
  keywordsJson: string[] | null;

  /**
   * Confidence score (0.0 - 1.0)
   */
  @Column({ type: 'float', nullable: true, name: 'confidence' })
  confidence: number | null;

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
   * Creation Timestamp
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation to Category
   * ON DELETE SET NULL: Log remains when category is deleted
   */
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'category_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_intent_logs__categories__category_id',
  })
  category: Category | null;

  /**
   * n:1 Relation to AppTerminal
   * ON DELETE SET NULL: Log remains when terminal is deleted
   */
  @ManyToOne(() => AppTerminal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'terminal_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_intent_logs__app_terminals__terminal_id',
  })
  terminal: AppTerminal | null;

  // =========================
  // Relations (Many-to-Many)
  // =========================

  /**
   * M:N Relation zu Keywords über Join-Table
   */
  @ManyToMany(() => Keyword, (keyword) => keyword.intentLogs)
  @JoinTable({
    name: 'intent_log_keywords',
    joinColumn: { name: 'intent_log_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'keyword_id', referencedColumnName: 'id' },
  })
  keywords: Keyword[];

  /**
   * 1:n Relation zu IntentLogKeyword (für position field)
   */
  @OneToMany(
    () => IntentLogKeyword,
    (intentLogKeyword) => intentLogKeyword.intentLog,
  )
  intentLogKeywords: IntentLogKeyword[];
}

