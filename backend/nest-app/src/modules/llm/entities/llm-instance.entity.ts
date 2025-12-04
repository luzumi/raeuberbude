import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum LlmHealth {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

@Entity('llm_instances')
@Index(['isActive'])
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

  @Column({ type: 'boolean', default: false })
  @Index()
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

  @Column({ type: 'json', nullable: true })
  config: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
