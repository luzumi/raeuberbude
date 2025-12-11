import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Home Assistant Entity
 * Unterstützt alle 27 Domänen: automation, binary_sensor, button, calendar, conversation,
 * device_tracker, event, image, input_boolean, input_number, input_select, light,
 * media_player, number, person, remote, script, select, sensor, stt, sun, switch,
 * todo, tts, update, weather, zone
 */
@Entity('ha_entities')
@Index(['domain'])
@Index(['area'])
@Index(['entityCategory'])
export class HaEntityEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'friendly_name' })
  friendlyName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_class' })
  deviceClass!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area!: string;

  /** Domain: z.B. light, switch, sensor, automation, etc. (alle 27 unterstützt) */
  @Column({ type: 'varchar', length: 100 })
  domain!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  platform!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'unique_id' })
  uniqueId!: string;

  @Column({ type: 'int', nullable: true, name: 'supported_features' })
  supportedFeatures!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'entity_category' })
  entityCategory!: string;

  /** Capabilities/Attributes als JSON (domain-spezifische Eigenschaften) */
  @Column({ type: 'json', nullable: true })
  capabilities!: any;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'original_name' })
  originalName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'object_id' })
  objectId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'entity_type' })
  entityType!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'device_id' })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'area_id' })
  areaId!: string | null;

  /** Icon (z.B. mdi:lightbulb) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon!: string | null;

  /** Hidden by user or system */
  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  /** Disabled by user or system */
  @Column({ type: 'boolean', default: false })
  disabled!: boolean;
}

// Backwards-compatible alias (some modules import `HaEntity`)
export { HaEntityEntity as HaEntity };
