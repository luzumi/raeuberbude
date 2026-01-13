import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum LlmHealth {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum LlmRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OTHER = 'other',
}

@Entity('llm_instances')
@Index(['isActive'])
@Index(['role'])
export class LlmInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  model: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: LlmRole,
    default: LlmRole.OTHER,
  })
  role: LlmRole;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'text', nullable: true, name: 'system_prompt' })
  systemPrompt: string | null;

  @Column({
    type: 'enum',
    enum: LlmHealth,
    default: LlmHealth.UNKNOWN,
  })
  health: LlmHealth;

  @Column({ type: 'datetime', nullable: true, name: 'last_health_check' })
  lastHealthCheck: Date | null;

  @Column({
    type: 'json',
    nullable: true
  })
  config: {
    // --- Generation / Sampling (Request-Parameter)
    temperature?: number;
    maxTokens?: number;
    topK?: number;
    topP?: number;
    repeatPenalty?: number;
    minPSampling?: number;

    // --- UI-only / App-Policy (nicht direkt Request-relevant)
    targetLatencyMs?: number;
    confidenceShortcut?: number;

    // --- Load & Performance (Model-Load/Runtime, nicht Chat-Request)
    contextLength?: number;
    evalBatchSize?: number;
    cpuThreads?: number;
    gpuOffload?: boolean;
    keepModelInMemory?: boolean;
    flashAttention?: boolean;
    kCacheQuant?: boolean;
    vCacheQuant?: boolean;

    // --- Misc / legacy
    timeoutMs?: number;
    autoReload?: boolean;
  } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
