import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HaEntity } from './ha-entity.entity';

/**
 * HaEntityAttribute Entity
 *
 * Stores dynamic entity attributes using EAV (Entity-Attribute-Value) pattern.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('ha_entity_attributes')
@Index('ix_ha_entity_attributes__entity_id', ['entityId'])
@Index('ix_ha_entity_attributes__attribute_key', ['attributeKey'])
@Index('ix_ha_entity_attributes__entity_key', ['entityId', 'attributeKey'])
export class HaEntityAttribute {
  /**
   * Primary Key (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Entity ID (Foreign Key to ha_entities.entity_id)
   */
  @Column({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId: string;

  /**
   * Attribute Key (e.g. 'brightness', 'color_temp', 'temperature')
   */
  @Column({ type: 'varchar', length: 255, name: 'attribute_key' })
  attributeKey: string;

  /**
   * Attribute Value (stored as JSON for flexibility)
   */
  @Column({ type: 'json', name: 'attribute_value' })
  attributeValue: any;

  /**
   * Value Type (for type safety, e.g. 'string', 'number', 'boolean', 'object')
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'value_type' })
  valueType: string | null;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation to HaEntity
   * ON DELETE CASCADE: Attribute is deleted when entity is deleted
   */
  @ManyToOne(() => HaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'entity_id',
    referencedColumnName: 'entityId',
    foreignKeyConstraintName: 'fk_ha_entity_attributes__ha_entities__entity_id',
  })
  entity: HaEntity;
}

