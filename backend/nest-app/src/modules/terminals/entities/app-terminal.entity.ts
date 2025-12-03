import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User, UserAllowedTerminal } from '../../auth/entities';
import { TerminalType, TerminalStatus } from '../enums';
import { TerminalRights } from './terminal-rights.entity';

/**
 * Terminal Capabilities Interface
 */
export interface TerminalCapabilities {
  microphone?: boolean;
  speaker?: boolean;
  camera?: boolean;
  touchscreen?: boolean;
  gps?: boolean;
  nfc?: boolean;
  wakeWord?: boolean;
}

/**
 * AppTerminal Entity
 *
 * Repräsentiert physische/virtuelle Endgeräte (Browser, Tablet, Kiosk),
 * die Speech-Input nutzen.
 *
 * @see database/entities-spec/terminals/app-terminal.entity.spec.md
 */
@Entity('app_terminals')
@Index('ix_app_terminals__terminal_id', ['terminalId'])
@Index('ix_app_terminals__status', ['status'])
@Index('ix_app_terminals__last_active_at', ['lastActiveAt'])
export class AppTerminal {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Stabiler Identifier (UNIQUE, z.B. Browser-Fingerprint)
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'terminal_id' })
  terminalId: string;

  /**
   * Benutzerfreundlicher Name
   */
  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  /**
   * Beschreibung/Notizen
   */
  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string | null;

  /**
   * Terminal-Typ
   */
  @Column({
    type: 'enum',
    enum: TerminalType,
    default: TerminalType.BROWSER,
    name: 'type',
  })
  type: TerminalType;

  /**
   * Standort (z.B. "Wohnzimmer", "Küche")
   */
  @Column({ type: 'text', nullable: true, name: 'location' })
  location: string | null;

  /**
   * Capabilities (microphone, speaker, camera, touchscreen)
   */
  @Column({ type: 'json', nullable: true, name: 'capabilities_json' })
  capabilitiesJson: TerminalCapabilities | null;

  /**
   * Terminal-Status
   */
  @Column({
    type: 'enum',
    enum: TerminalStatus,
    default: TerminalStatus.ACTIVE,
    name: 'status',
  })
  status: TerminalStatus;

  /**
   * Letzter Ping/Zugriff
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_active_at' })
  lastActiveAt: Date | null;

  /**
   * Optional: Primärbenutzer (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'assigned_user_id' })
  assignedUserId: string | null;

  /**
   * Erlaubte Actions (z.B. ['speech_input', 'tts', 'ha_control'])
   */
  @Column({ type: 'json', nullable: true, name: 'allowed_actions_json' })
  allowedActionsJson: string[] | null;

  /**
   * Terminal-spezifische Settings
   */
  @Column({ type: 'json', nullable: true, name: 'settings_json' })
  settingsJson: Record<string, any> | null;

  /**
   * Zusätzliche Metadaten (IP, User-Agent, etc.)
   */
  @Column({ type: 'json', nullable: true, name: 'metadata_json' })
  metadataJson: Record<string, any> | null;

  /**
   * Registrierungszeitpunkt
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
   * n:1 Relation zu User (assignedUser)
   * ON DELETE SET NULL: Terminal bleibt erhalten, wenn User gelöscht wird
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'assigned_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_app_terminals__users__assigned_user_id',
  })
  assignedUser: User | null;

  /**
   * 1:n Relation zu UserAllowedTerminal (M:N Join-Table)
   */
  @OneToMany(
    () => UserAllowedTerminal,
    (userAllowedTerminal) => userAllowedTerminal.terminal,
  )
  allowedUsers: UserAllowedTerminal[];

  /**
   * 1:1 Relation zu TerminalRights
   * Cascade: Terminal-Löschung entfernt auch die Rechte
   */
  @OneToOne(() => TerminalRights, (rights) => rights.terminal, {
    cascade: true,
  })
  terminalRights: TerminalRights;

  // Weitere Relations werden in späteren Phasen hinzugefügt:
  // - speechInputs: SpeechHumanInput[] (1:n)
  // - intentLogs: IntentLog[] (1:n)
  // - transcripts: SpeechTranscript[] (1:n)
}

