import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppTerminal } from './app-terminal.entity';
import { TerminalRightsStatus } from '../enums';

/**
 * TerminalRights Entity
 *
 * 1:1-Erweiterung zu AppTerminal für Berechtigungen und Beschränkungen.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('terminal_rights')
@Index('ix_terminal_rights__status', ['status'])
@Index('ix_terminal_rights__role_key', ['roleKey'])
export class TerminalRights {
  /**
   * Primärschlüssel = Foreign Key zu app_terminals.id
   */
  @PrimaryColumn('uuid', { name: 'terminal_id' })
  terminalId: string;

  /**
   * Rollen-Schlüssel (z.B. 'kiosk', 'personal_device', 'admin_console')
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'role_key' })
  roleKey: string | null;

  /**
   * Status der Terminal-Berechtigungen
   */
  @Column({
    type: 'enum',
    enum: TerminalRightsStatus,
    default: TerminalRightsStatus.ACTIVE,
    name: 'status',
  })
  status: TerminalRightsStatus;

  /**
   * Erlaubte Actions als JSON-Array
   * Beispiel: ['speech_input', 'tts', 'ha_control']
   */
  @Column({ type: 'json', nullable: true, name: 'allowed_actions_json' })
  allowedActionsJson: string[] | null;

  /**
   * Beschränkungen/Restriktionen
   * Beispiel: { maxDailyRequests: 1000, allowedHours: '08:00-22:00' }
   */
  @Column({ type: 'json', nullable: true, name: 'restrictions_json' })
  restrictionsJson: Record<string, any> | null;

  /**
   * Zusätzliche Metadaten
   */
  @Column({ type: 'json', nullable: true, name: 'metadata_json' })
  metadataJson: Record<string, any> | null;

  /**
   * Erstellungszeitpunkt
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * Letztes Update
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * 1:1 Relation zu AppTerminal
   * ON DELETE CASCADE: Wenn Terminal gelöscht wird, werden auch Rights gelöscht
   */
  @OneToOne(() => AppTerminal, (terminal) => terminal.terminalRights, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'terminal_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_terminal_rights__app_terminals__terminal_id',
  })
  terminal: AppTerminal;
}

