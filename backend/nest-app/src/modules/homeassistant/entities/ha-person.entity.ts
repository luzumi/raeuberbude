import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_persons')
export class HaPerson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id', unique: true })
  entityId: string;

  @OneToOne(() => HaEntity, entity => entity.person)
  @JoinColumn({ name: 'entity_id', referencedColumnName: 'id' })
  entity: HaEntity;

  @Column({ name: 'person_id', unique: true })
  personId: string;

  @Column()
  name: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'device_trackers', type: 'jsonb', nullable: true })
  deviceTrackers: string[];

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ name: 'gps_accuracy', type: 'float', nullable: true })
  gpsAccuracy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
