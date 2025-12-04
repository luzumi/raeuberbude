import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('intent_logs')
@Index(['timestamp'])
@Index(['intent'])
@Index(['terminalId'])
@Index(['createdAt'])
@Index(['intent', 'createdAt'])
@Index(['terminalId', 'createdAt'])
export class IntentLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  timestamp: string;

  @Column({ type: 'text' })
  transcript: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  intent: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'json', nullable: true })
  keywords: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'terminal_id' })
  @Index()
  terminalId: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

