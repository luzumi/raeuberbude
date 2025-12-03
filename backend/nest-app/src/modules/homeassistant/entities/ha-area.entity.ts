import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * HaArea Entity
 *
 * Represents a HomeAssistant area/room.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_areas')
@Index('uq_ha_areas__area_id', ['areaId'], { unique: true })
@Index('ix_ha_areas__name', ['name'])
export class HaArea {
  /**
   * Surrogate Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Natural Key from HomeAssistant (UNIQUE)
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'area_id' })
  areaId: string;

  /**
   * Area Name
   */
  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  /**
   * Area Aliases (JSON array)
   */
  @Column({ type: 'json', nullable: true, name: 'aliases' })
  aliases: string[] | null;

  /**
   * Floor/Level
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'floor' })
  floor: string | null;

  /**
   * Icon
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'icon' })
  icon: string | null;

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

  // Relations will be added after HaDevice and HaEntity are created:
  // - devices: HaDevice[] (1:n)
  // - entities: HaEntity[] (1:n)
}

