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
import { User } from './user.entity';
import { UserRole, UserStatus } from '../enums';

/**
 * UserRights Entity
 *
 * 1:1-Erweiterung zu User für Rollen und Berechtigungen.
 * Trennung von Authentifizierung (User) und Autorisierung (Rights).
 *
 * @see database/entities-spec/auth/user-rights.entity.spec.md
 */
@Entity('user_rights')
@Index('ix_user_rights__role', ['role'])
@Index('ix_user_rights__status', ['status'])
export class UserRights {
  /**
   * Primärschlüssel = Foreign Key zu app_users.id
   */
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  /**
   * Benutzerrolle
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.REGULAR,
    name: 'role',
  })
  role: UserRole;

  /**
   * Benutzerstatus
   */
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    name: 'status',
  })
  status: UserStatus;

  /**
   * Optionales Ablaufdatum der Rechte
   */
  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  /**
   * Custom Permissions als JSON-Array
   * Beispiel: ['read:transcripts', 'write:terminals']
   * TypeORM automatically serializes/deserializes JSON
   */
  @Column({ type: 'json', nullable: true, name: 'permissions_json' })
  permissionsJson: string[] | null;

  // =========================
  // Boolean Permissions
  // =========================

  /**
   * Spracheingabe erlaubt
   */
  @Column({ type: 'boolean', default: true, name: 'can_use_speech_input' })
  canUseSpeechInput: boolean;

  /**
   * Eigene Eingaben anzeigen
   */
  @Column({ type: 'boolean', default: true, name: 'can_view_own_inputs' })
  canViewOwnInputs: boolean;

  /**
   * Alle Eingaben anzeigen
   */
  @Column({ type: 'boolean', default: false, name: 'can_view_all_inputs' })
  canViewAllInputs: boolean;

  /**
   * Eingaben löschen
   */
  @Column({ type: 'boolean', default: false, name: 'can_delete_inputs' })
  canDeleteInputs: boolean;

  /**
   * Terminal-Verwaltung
   */
  @Column({ type: 'boolean', default: false, name: 'can_manage_terminals' })
  canManageTerminals: boolean;

  /**
   * Benutzer-Verwaltung
   */
  @Column({ type: 'boolean', default: false, name: 'can_manage_users' })
  canManageUsers: boolean;

  /**
   * Zusätzliche Metadaten (z.B. grantedBy, reason)
   */
  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

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
   * 1:1 Relation to User (back-reference)
   */
  @OneToOne(() => User, (user) => user.userRights)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

// Re-export enums for convenience
export { UserStatus, UserRole };
