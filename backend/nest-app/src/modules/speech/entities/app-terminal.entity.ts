import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../../users/entities/user.entity'

export enum TerminalType {
  BROWSER = 'browser',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  KIOSK = 'kiosk',
  SMART_TV = 'smart-tv',
  OTHER = 'other',
}

export enum TerminalStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Entity('app_terminals')
@Index(['terminalId'], { unique: true })
export class AppTerminalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'terminal_id' })
  terminalId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TerminalType,
    default: TerminalType.BROWSER,
  })
  type: TerminalType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'json', nullable: true })
  capabilities: {
    hasMicrophone?: boolean;
    hasCamera?: boolean;
    hasSpeaker?: boolean;
    hasDisplay?: boolean;
    supportsSpeechRecognition?: boolean;
  };

  @Column({
    type: 'enum',
    enum: TerminalStatus,
    default: TerminalStatus.ACTIVE,
  })
  status: TerminalStatus;

  @Column({ type: 'datetime', nullable: true, name: 'last_active_at' })
  lastActiveAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_user_id' })
  assignedUserId: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser: UserEntity;

  @Column({ type: 'json', default: '[]', name: 'allowed_actions' })
  allowedActions: string[];

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

