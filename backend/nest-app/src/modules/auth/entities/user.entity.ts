import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRights } from './user-rights.entity';
import { UserAllowedTerminal } from './user-allowed-terminal.entity';

/**
 * User Entity
 *
 * Zentrale Benutzerentität für App-Authentifizierung und Autorisierung.
 * Nutzt app_users Tabelle in MariaDB (MongoDB deprecated).
 *
 * @see database/entities-spec/auth/user.entity.spec.md
 */
@Entity('app_users')
@Index('ix_app_users__username', ['username'])
@Index('ix_app_users__email', ['email'])
@Index('ix_app_users__created_at', ['createdAt'])
export class User {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Login-Name (UNIQUE)
   */
  @Column({ type: 'varchar', length: 100, unique: true, name: 'username' })
  username: string;

  /**
   * E-Mail (UNIQUE, lowercase)
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'email' })
  email: string;

  /**
   * bcrypt/argon2-Hash des Passworts
   */
  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password: string;

  /**
   * Flexible Zusatzinfos (Name, Avatar, Theme, etc.)
   * Verwendet JSONB (PostgreSQL) oder JSON (MariaDB)
   * ACHTUNG: Spalte existiert noch nicht in app_users Tabelle - daher select: false
   */
  @Column({ type: 'json', nullable: true, name: 'profile_data', select: false })
  profileData?: Record<string, any> | null;

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
   * 1:1 Relation zu UserRights
   * Cascade: User-Löschung entfernt auch die Rechte
   */
  @OneToOne(() => UserRights, (userRights) => userRights.user, {
    cascade: true,
  })
  userRights: UserRights;

  /**
   * 1:n Relation zu UserAllowedTerminal (M:N Join-Table)
   */
  @OneToMany(
    () => UserAllowedTerminal,
    (userAllowedTerminal) => userAllowedTerminal.user,
  )
  allowedTerminals: UserAllowedTerminal[];

  // Weitere Relations werden in späteren Phasen hinzugefügt:
  // - speechInputs: SpeechHumanInput[]
  // - testInputs: SpeechTestInput[]
  // - transcripts: SpeechTranscript[]
  // - intentLogs: IntentLog[]
  // - eventLogs: EventLog[]
  // - assignedTerminals: AppTerminal[] (reverse side of assigned_user_id)
}
