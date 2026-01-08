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
import { HaDevice } from './ha-device.entity';
import { HaArea } from './ha-area.entity';

/**
 * DeviceAreaBinding Entity
 *
 * Explizite Verknüpfung von Devices mit Areas/Räumen.
 * Erweitert die native HA area_id Zuordnung um zusätzliche Features:
 * - Multi-Area Support (ein Device in mehreren Räumen sichtbar)
 * - Temporäre Zuordnungen (z.B. mobiles Device)
 * - Benutzerdefinierte Kategorisierung
 *
 * Beispiele:
 * - Device "LG Fernseher" → Area "Wohnzimmer" (primary)
 * - Device "Pixel 8 Pro" → Area "Wohnzimmer" (temporär)
 * - Device "Roomba" → Area "Wohnzimmer" + "Küche" (multi-area)
 */
@Entity('device_area_bindings')
@Unique('uq_device_area_bindings__device_area', ['haDeviceId', 'haAreaId'])
@Index('ix_device_area_bindings__ha_device_id', ['haDeviceId'])
@Index('ix_device_area_bindings__ha_area_id', ['haAreaId'])
@Index('ix_device_area_bindings__is_primary', ['isPrimary'])
export class DeviceAreaBinding {
  /**
   * Surrogate Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign Key zu ha_devices
   */
  @Column({ type: 'uuid', name: 'ha_device_id' })
  haDeviceId: string;

  /**
   * Foreign Key zu ha_areas
   */
  @Column({ type: 'uuid', name: 'ha_area_id' })
  haAreaId: string;

  /**
   * Ist dies die primäre Area-Zuordnung?
   * Pro Device sollte nur eine Area primary sein.
   */
  @Column({ type: 'boolean', default: true, name: 'is_primary' })
  isPrimary: boolean;

  /**
   * Ist diese Zuordnung temporär? (z.B. mobiles Device)
   * Kann für Auto-Cleanup genutzt werden.
   */
  @Column({ type: 'boolean', default: false, name: 'is_temporary' })
  isTemporary: boolean;

  /**
   * Gültig von (optional, für temporäre Zuordnungen)
   */
  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom: Date | null;

  /**
   * Gültig bis (optional, für temporäre Zuordnungen)
   */
  @Column({ type: 'timestamp', nullable: true, name: 'valid_until' })
  validUntil: Date | null;

  /**
   * Zusätzliche Metadaten (JSON)
   * z.B. Positionsinfo, Notizen, etc.
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
   * Many-to-One zu HaDevice
   */
  @ManyToOne(() => HaDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ha_device_id' })
  haDevice: HaDevice;

  /**
   * Many-to-One zu HaArea
   */
  @ManyToOne(() => HaArea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ha_area_id' })
  haArea: HaArea;
}

