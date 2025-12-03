import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AppTerminal } from '../../terminals/entities/app-terminal.entity';

/**
 * UserAllowedTerminal Entity
 *
 * Join-Table für M:N-Beziehung zwischen User und AppTerminal.
 * Definiert, welche Benutzer auf welche Terminals zugreifen dürfen.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('user_allowed_terminals')
export class UserAllowedTerminal {
  /**
   * Composite Primary Key: user_id
   */
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  /**
   * Composite Primary Key: terminal_id
   */
  @PrimaryColumn('uuid', { name: 'terminal_id' })
  terminalId: string;

  /**
   * Zeitpunkt der Berechtigung
   */
  @CreateDateColumn({ type: 'timestamp', name: 'granted_at' })
  grantedAt: Date;

  /**
   * Optional: Ablaufdatum der Berechtigung
   */
  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  /**
   * Optional: Zusätzliche Metadaten (z.B. grantedBy, reason)
   */
  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

  // =========================
  // Relations
  // =========================

  /**
   * Relation zu User
   * ON DELETE CASCADE: Wenn User gelöscht wird, werden auch Berechtigungen gelöscht
   */
  @ManyToOne(() => User, (user) => user.allowedTerminals, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_user_allowed_terminals__users__user_id',
  })
  user: User;

  /**
   * Relation zu AppTerminal
   * ON DELETE CASCADE: Wenn Terminal gelöscht wird, werden auch Berechtigungen gelöscht
   */
  @ManyToOne(() => AppTerminal, (terminal) => terminal.allowedUsers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'terminal_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName:
      'fk_user_allowed_terminals__app_terminals__terminal_id',
  })
  terminal: AppTerminal;
}

