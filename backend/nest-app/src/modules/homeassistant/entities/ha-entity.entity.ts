import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HaEntityDomain } from '../enums';
import { HaArea } from './ha-area.entity';
import { HaDevice } from './ha-device.entity';

/**
 * HaEntity Entity
 *
 * Represents a HomeAssistant entity with natural primary key (entity_id).
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_entities')
@Index('uq_ha_entities__entity_id', ['entityId'], { unique: true })
@Index('ix_ha_entities__domain', ['domain'])
@Index('ix_ha_entities__area_id', ['areaId'])
@Index('ix_ha_entities__device_id', ['deviceId'])
export class HaEntity {
  /**
   * Natural Primary Key from HomeAssistant (e.g. 'light.living_room_main')
   */
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId: string;

  /**
   * Entity Domain (light, switch, sensor, etc.)
   */
  @Column({
    type: 'enum',
    enum: HaEntityDomain,
    name: 'domain',
  })
  domain: HaEntityDomain;

  /**
   * Object ID (part after domain, e.g. 'living_room_main')
   */
  @Column({ type: 'varchar', length: 255, name: 'object_id' })
  objectId: string;

  /**
   * Friendly Name
   */
  @Column({ type: 'varchar', length: 255, name: 'friendly_name' })
  friendlyName: string;

  /**
   * Entity Aliases (JSON array)
   */
  @Column({ type: 'json', nullable: true, name: 'aliases' })
  aliases: string[] | null;

  /**
   * Icon
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'icon' })
  icon: string | null;

  /**
   * Device Class (e.g. 'temperature', 'humidity')
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_class' })
  deviceClass: string | null;

  /**
   * Unit of Measurement (e.g. '°C', '%')
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'unit_of_measurement' })
  unitOfMeasurement: string | null;

  /**
   * Area ID (Foreign Key to ha_areas.area_id)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'area_id' })
  areaId: string | null;

  /**
   * Device ID (Foreign Key to ha_devices.device_id)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_id' })
  deviceId: string | null;

  /**
   * Platform (e.g. 'hue', 'mqtt')
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'platform' })
  platform: string | null;

  /**
   * Is entity disabled?
   */
  @Column({ type: 'boolean', default: false, name: 'disabled' })
  disabled: boolean;

  /**
   * Is entity hidden?
   */
  @Column({ type: 'boolean', default: false, name: 'hidden' })
  hidden: boolean;

  /**
   * Entity Category (diagnostic, config)
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'entity_category' })
  entityCategory: string | null;

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
   * n:1 Relation to HaArea
   * ON DELETE SET NULL: Entity remains when area is deleted
   */
  @ManyToOne(() => HaArea, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'area_id',
    referencedColumnName: 'areaId',
    foreignKeyConstraintName: 'fk_ha_entities__ha_areas__area_id',
  })
  area: HaArea | null;

  /**
   * n:1 Relation to HaDevice
   * ON DELETE SET NULL: Entity remains when device is deleted
   */
  @ManyToOne(() => HaDevice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'device_id',
    referencedColumnName: 'deviceId',
    foreignKeyConstraintName: 'fk_ha_entities__ha_devices__device_id',
  })
  device: HaDevice | null;

  // Relations will be added after HaEntityState and HaEntityAttribute are created:
  // - states: HaEntityState[] (1:n)
  // - attributes: HaEntityAttribute[] (1:n)
}

