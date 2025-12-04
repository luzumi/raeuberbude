import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HaArea } from './ha-area.entity';

/**
 * HaDevice Entity
 *
 * Represents a HomeAssistant device.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_devices')
@Index('uq_ha_devices__device_id', ['deviceId'], { unique: true })
@Index('ix_ha_devices__area_id', ['areaId'])
export class HaDevice {
  /**
   * Surrogate Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Natural Key from HomeAssistant (UNIQUE)
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'device_id' })
  deviceId: string;

  /**
   * Device Name
   */
  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  /**
   * Manufacturer
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'manufacturer' })
  manufacturer: string | null;

  /**
   * Model
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'model' })
  model: string | null;

  /**
   * Software Version
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sw_version' })
  swVersion: string | null;

  /**
   * Configuration URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'configuration_url' })
  configurationUrl: string | null;

  /**
   * Device Connections (JSON array)
   */
  @Column({ type: 'json', nullable: true, name: 'connections' })
  connections: any[] | null;

  /**
   * Device Identifiers (JSON array)
   */
  @Column({ type: 'json', nullable: true, name: 'identifiers' })
  identifiers: any[] | null;

  /**
   * Via Device ID (self-reference for device hierarchy)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'via_device_id' })
  viaDeviceId: string | null;

  /**
   * Area ID (Foreign Key to ha_areas.area_id)
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'area_id' })
  areaId: string | null;

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
   * ON DELETE SET NULL: Device remains when the area is deleted
   */
  @ManyToOne(() => HaArea, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'area_id',
    referencedColumnName: 'areaId',
    foreignKeyConstraintName: 'fk_ha_devices__ha_areas__area_id',
  })
  area: HaArea | null;

  /**
   * Self-reference for device hierarchy (via_device)
   * ON DELETE SET NULL: Device remains when the parent is deleted
   */
  @ManyToOne(() => HaDevice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'via_device_id',
    referencedColumnName: 'deviceId',
    foreignKeyConstraintName: 'fk_ha_devices__ha_devices__via_device_id',
  })
  viaDevice: HaDevice | null;

  // Relations will be added after HaEntity is created:
  // - entities: HaEntity[] (1:n)
}

