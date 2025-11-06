import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { HaDevice } from './ha-device.entity';
import { HaArea } from './ha-area.entity';
import { HaEntityState } from './ha-entity-state.entity';
import { HaPerson } from './ha-person.entity';
import { HaZone } from './ha-zone.entity';
import { HaAutomation } from './ha-automation.entity';
import { HaMediaPlayer } from './ha-media-player.entity';

export enum EntityType {
  SENSOR = 'sensor',
  BINARY_SENSOR = 'binary_sensor',
  LIGHT = 'light',
  SWITCH = 'switch',
  ZONE = 'zone',
  SCRIPT = 'script',
  INPUT_BOOLEAN = 'input_boolean',
  INPUT_NUMBER = 'input_number',
  INPUT_SELECT = 'input_select',
  PERSON = 'person',
  NUMBER = 'number',
  SELECT = 'select',
  DEVICE_TRACKER = 'device_tracker',
  MEDIA_PLAYER = 'media_player',
  AUTOMATION = 'automation'
}

@Entity('ha_entities')
export class HaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id', unique: true })
  entityId: string;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: EntityType
  })
  entityType: EntityType;

  @Column()
  domain: string;

  @Column({ name: 'object_id' })
  objectId: string;

  @Column({ name: 'friendly_name', nullable: true })
  friendlyName: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @ManyToOne(() => HaDevice, device => device.entities, { nullable: true })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: HaDevice;

  @Column({ name: 'area_id', nullable: true })
  areaId: string;

  @ManyToOne(() => HaArea, area => area.entities, { nullable: true })
  @JoinColumn({ name: 'area_id', referencedColumnName: 'area_id' })
  area: HaArea;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => HaEntityState, state => state.entity)
  states: HaEntityState[];

  @OneToOne(() => HaPerson, person => person.entity)
  person: HaPerson;

  @OneToOne(() => HaZone, zone => zone.entity)
  zone: HaZone;

  @OneToOne(() => HaAutomation, automation => automation.entity)
  automation: HaAutomation;

  @OneToOne(() => HaMediaPlayer, mediaPlayer => mediaPlayer.entity)
  mediaPlayer: HaMediaPlayer;
}
