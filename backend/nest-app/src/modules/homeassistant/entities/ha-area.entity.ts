import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { HaEntity } from './ha-entity.entity';
import { HaDevice } from './ha-device.entity';

@Entity('ha_areas')
export class HaArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'area_id', unique: true })
  areaId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  aliases: string[];

  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  icon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => HaEntity, entity => entity.area)
  entities: HaEntity[];

  @OneToMany(() => HaDevice, device => device.area)
  devices: HaDevice[];
}
