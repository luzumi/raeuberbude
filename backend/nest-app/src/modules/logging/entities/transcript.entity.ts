import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Keyword } from './keyword.entity';
import { Suggestion } from './suggestion.entity';
import { TranscriptKeyword } from './transcript-keyword.entity';
import { TranscriptSuggestion } from './transcript-suggestion.entity';

@Entity('transcripts')
@Index(['userId', 'createdAt'])
@Index(['terminalId', 'createdAt'])
@Index(['model', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['isValid', 'createdAt'])
export class TranscriptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'terminal_id' })
  @Index()
  terminalId: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'audio_blob_ref' })
  audioBlobRef: string;

  @Column({ type: 'text' })
  transcript: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'stt_confidence' })
  sttConfidence: number;

  @Column({ type: 'text', nullable: true, name: 'ai_adjusted_text' })
  aiAdjustedText: string;

  @Column({ type: 'json', nullable: true })
  suggestions: string[];

  @Column({ type: 'boolean', default: false, name: 'suggestion_flag' })
  suggestionFlag: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  category: string;

  @Column({ type: 'json', nullable: true })
  intent: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_valid' })
  isValid: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number;

  @Column({ type: 'boolean', default: false, name: 'has_ambiguity' })
  hasAmbiguity: boolean;

  @Column({ type: 'boolean', default: false, name: 'clarification_needed' })
  clarificationNeeded: boolean;

  @Column({ type: 'text', nullable: true, name: 'clarification_question' })
  clarificationQuestion: string;

  @Column({ type: 'int', name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'json', nullable: true })
  timings: {
    sttMs?: number;
    preProcessMs?: number;
    llmMs?: number;
    dbMs?: number;
    networkMs?: number;
  };

  @Column({ type: 'varchar', length: 255 })
  @Index()
  model: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'llm_url' })
  llmUrl: string;

  @Column({ type: 'varchar', length: 100, default: 'lmstudio', name: 'llm_provider' })
  llmProvider: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  temperature: number;

  @Column({ type: 'int', nullable: true, name: 'max_tokens' })
  maxTokens: number;

  @Column({ type: 'json', nullable: true, name: 'raw_response' })
  rawResponse: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'boolean', default: false, name: 'fallback_used' })
  fallbackUsed: boolean;

  // Home Assistant Assignment fields
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_area_id' })
  @Index()
  assignedAreaId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_entity_id' })
  @Index()
  assignedEntityId: string;

  @Column({ type: 'json', nullable: true, name: 'assigned_action' })
  assignedAction: {
    type?: string;
    label?: string;
    params?: Record<string, any>;
  };

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_trigger' })
  assignedTrigger: string;

  @Column({ type: 'datetime', nullable: true, name: 'assigned_trigger_at' })
  assignedTriggerAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // =========================
  // Relations (Many-to-Many)
  // =========================

  /**
   * M:N Relation zu Keywords über Join-Table
   */
  @ManyToMany(() => Keyword, (keyword) => keyword.transcripts)
  @JoinTable({
    name: 'transcript_keywords',
    joinColumn: { name: 'transcript_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'keyword_id', referencedColumnName: 'id' },
  })
  keywords: Keyword[];

  /**
   * M:N Relation zu Suggestions über Join-Table
   */
  @ManyToMany(() => Suggestion, (suggestion) => suggestion.transcripts)
  @JoinTable({
    name: 'transcript_suggestions',
    joinColumn: { name: 'transcript_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'suggestion_id', referencedColumnName: 'id' },
  })
  suggestionsEntities: Suggestion[];

  /**
   * 1:n Relation zu TranscriptKeyword (für position field)
   */
  @OneToMany(
    () => TranscriptKeyword,
    (transcriptKeyword) => transcriptKeyword.transcript,
  )
  transcriptKeywords: TranscriptKeyword[];

  /**
   * 1:n Relation zu TranscriptSuggestion (für position field)
   */
  @OneToMany(
    () => TranscriptSuggestion,
    (transcriptSuggestion) => transcriptSuggestion.transcript,
  )
  transcriptSuggestions: TranscriptSuggestion[];
}
