import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HaArea } from './ha-area.entity';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_devices')
export class HaDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', unique: true })
  deviceId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  model: string;

  @Column({ name: 'sw_version', nullable: true })
  swVersion: string;

  @Column({ name: 'configuration_url', nullable: true })
  configurationUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  connections: any[];

  @Column({ type: 'jsonb', nullable: true })
  identifiers: any[];

  @Column({ name: 'via_device_id', nullable: true })
  viaDeviceId: string;

  @ManyToOne(() => HaDevice, device => device.childDevices, { nullable: true })
  @JoinColumn({ name: 'via_device_id', referencedColumnName: 'device_id' })
  viaDevice: HaDevice;

  @OneToMany(() => HaDevice, device => device.viaDevice)
  childDevices: HaDevice[];

  @Column({ name: 'area_id', nullable: true })
  areaId: string;

  @ManyToOne(() => HaArea, area => area.devices, { nullable: true })
  @JoinColumn({ name: 'area_id', referencedColumnName: 'area_id' })
  area: HaArea;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => HaEntity, entity => entity.device)
  entities: HaEntity[];
}
