import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { HaEntityState } from './ha-entity-state.entity';

export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object'
}

@Entity('ha_entity_attributes')
export class HaEntityAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_state_id' })
  entityStateId: string;

  @ManyToOne(() => HaEntityState, state => state.attributes)
  @JoinColumn({ name: 'entity_state_id' })
  entityState: HaEntityState;

  @Column({ name: 'attribute_key' })
  attributeKey: string;

  @Column({ name: 'attribute_value', type: 'jsonb' })
  attributeValue: any;

  @Column({
    name: 'attribute_type',
    type: 'enum',
    enum: AttributeType
  })
  attributeType: AttributeType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
