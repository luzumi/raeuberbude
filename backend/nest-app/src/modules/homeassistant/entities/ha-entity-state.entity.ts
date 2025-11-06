import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HaEntity } from './ha-entity.entity';
import { HaSnapshot } from './ha-snapshot.entity';
import { HaEntityAttribute } from './ha-entity-attribute.entity';

@Entity('ha_entity_states')
export class HaEntityState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @ManyToOne(() => HaEntity, entity => entity.states)
  @JoinColumn({ name: 'entity_id', referencedColumnName: 'id' })
  entity: HaEntity;

  @Column({ name: 'snapshot_id' })
  snapshotId: string;

  @ManyToOne(() => HaSnapshot, snapshot => snapshot.entityStates)
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: HaSnapshot;

  @Column({ nullable: true })
  state: string;

  @Column({ name: 'state_class', nullable: true })
  stateClass: string;

  @Column({ name: 'last_changed', type: 'timestamp', nullable: true })
  lastChanged: Date;

  @Column({ name: 'last_updated', type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => HaEntityAttribute, attribute => attribute.entityState, { cascade: true })
  attributes: HaEntityAttribute[];
}
