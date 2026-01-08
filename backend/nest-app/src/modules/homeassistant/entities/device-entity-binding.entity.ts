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
import { HaEntityEntity } from './ha-entity.entity';

/**
 * DeviceEntityBinding Entity
 *
 * Verknüpft HomeAssistant-Entities explizit mit Devices.
 * HomeAssistant macht dies automatisch, aber wir erlauben manuelle Overrides
 * und Gruppierungen (z.B. alle Battery-Sensoren zu einem Device).
 *
 * Beispiele:
 * - Entity "sensor.pixel_8_pro_battery" → Device "Pixel 8 Pro"
 * - Entity "sensor.pixel_8_pro_wifi_connection" → Device "Pixel 8 Pro"
 * - Entity "light.wohnzimmer_decke" → Device "Hue Bridge"
 *
 * Use Case: Wenn HA ein Entity nicht automatisch einem Device zuordnet,
 * oder wenn man gruppieren möchte (z.B. alle Zigbee-Sensoren eines Raums).
 */
@Entity('device_entity_bindings')
@Unique('uq_device_entity_bindings__device_entity', ['haDeviceId', 'haEntityId'])
@Index('ix_device_entity_bindings__ha_device_id', ['haDeviceId'])
@Index('ix_device_entity_bindings__ha_entity_id', ['haEntityId'])
@Index('ix_device_entity_bindings__binding_type', ['bindingType'])
export class DeviceEntityBinding {
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
   * Foreign Key zu ha_entities (entity_id)
   */
  @Column({ type: 'varchar', length: 255, name: 'ha_entity_id' })
  haEntityId: string;

  /**
   * Typ der Bindung:
   * - 'auto': Automatisch von HA erkannt (Read-Only, für Referenz)
   * - 'manual': Manuell vom User erstellt
   * - 'suggested': Vom System vorgeschlagen, aber noch nicht bestätigt
   */
  @Column({
    type: 'enum',
    enum: ['auto', 'manual', 'suggested'],
    default: 'manual',
    name: 'binding_type',
  })
  bindingType: 'auto' | 'manual' | 'suggested';

  /**
   * Benutzerdefinierte Kategorie/Gruppe (optional)
   * z.B. "Battery Sensors", "Location Sensors", "Controls"
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'custom_category' })
  customCategory: string | null;

  /**
   * Priorität/Reihenfolge für UI-Darstellung (0 = höchste)
   */
  @Column({ type: 'int', default: 100, name: 'display_order' })
  displayOrder: number;

  /**
   * Ist dieses Entity für dieses Device sichtbar?
   * Erlaubt Hiding von irrelevanten Entities
   */
  @Column({ type: 'boolean', default: true, name: 'is_visible' })
  isVisible: boolean;

  /**
   * Zusätzliche Metadaten (JSON)
   * z.B. UI-Präferenzen, Farben, Icons, etc.
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
   * Many-to-One zu HaEntityEntity
   */
  @ManyToOne(() => HaEntityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ha_entity_id' })
  haEntity: HaEntityEntity;
}

