import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { HaEntity } from './ha-entity.entity';

export enum AutomationMode {
  SINGLE = 'single',
  RESTART = 'restart',
  QUEUED = 'queued',
  PARALLEL = 'parallel'
}

@Entity('ha_automations')
export class HaAutomation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id', unique: true })
  entityId: string;

  @OneToOne(() => HaEntity, entity => entity.automation)
  @JoinColumn({ name: 'entity_id', referencedColumnName: 'id' })
  entity: HaEntity;

  @Column({ name: 'automation_id', unique: true })
  automationId: string;

  @Column()
  alias: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AutomationMode,
    default: AutomationMode.SINGLE
  })
  mode: AutomationMode;

  @Column({ type: 'int', default: 0 })
  current: number;

  @Column({ type: 'int', nullable: true })
  max: number;

  @Column({ type: 'jsonb', nullable: true })
  triggers: any;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({ type: 'jsonb', nullable: true })
  actions: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
