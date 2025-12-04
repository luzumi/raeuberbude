import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('ha_entities')
@Index(['entityId'], { unique: true })
@Index(['domain'])
@Index(['area'])
export class HaEntityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'friendly_name' })
  friendlyName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_class' })
  deviceClass!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area!: string;

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
}
