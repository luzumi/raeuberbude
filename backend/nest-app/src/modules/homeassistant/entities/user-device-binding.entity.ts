import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities';
import { HaDevice } from './ha-device.entity';

/**
 * UserDeviceBinding Entity
 *
 * Verknüpft App-User mit HomeAssistant-Geräten (z.B. Pixel 8 Pro → User).
 * Ermöglicht personalisierte Geräte-Ansichten und Zugriffskontrolle.
 *
 * Beispiele:
 * - User "Max" → Device "Pixel 8 Pro"
 * - User "Anna" → Device "iPhone 14"
 * - User "Admin" → Device "Staubsauger Roborock"
 */
@Entity('user_device_bindings')
@Unique('uq_user_device_bindings__user_device', ['userId', 'haDeviceId'])
@Index('ix_user_device_bindings__user_id', ['userId'])
@Index('ix_user_device_bindings__ha_device_id', ['haDeviceId'])
export class UserDeviceBinding {
  /**
   * Surrogate Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign Key zu app_users
   */
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /**
   * Foreign Key zu ha_devices
   */
  @Column({ type: 'uuid', name: 'ha_device_id' })
  haDeviceId: string;

  /**
   * User-spezifischer Alias für das Gerät (optional)
   * z.B. "Mein Handy" statt "Pixel 8 Pro"
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'custom_alias' })
  customAlias: string | null;

  /**
   * Ist dies das primäre/Standard-Gerät des Users?
   * z.B. für Push-Notifications
   */
  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary: boolean;

  /**
   * Zusätzliche Metadaten (JSON)
   * z.B. Berechtigungen, Notification-Präferenzen, etc.
   */
  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

  /**
   * Creation Timestamp
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * Last Update
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * Many-to-One zu User
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Many-to-One zu HaDevice
   */
  @ManyToOne(() => HaDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ha_device_id' })
  haDevice: HaDevice;
}

