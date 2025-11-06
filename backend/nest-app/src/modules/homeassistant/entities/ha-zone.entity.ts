import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_zones')
export class HaZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id', unique: true })
  entityId: string;

  @OneToOne(() => HaEntity, entity => entity.zone)
  @JoinColumn({ name: 'entity_id', referencedColumnName: 'id' })
  entity: HaEntity;

  @Column({ name: 'zone_name' })
  zoneName: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'float' })
  radius: number;

  @Column({ type: 'boolean', default: false })
  passive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  persons: string[];

  @Column({ nullable: true })
  icon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
