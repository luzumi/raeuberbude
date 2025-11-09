import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HaEntityAttributeDocument = HaEntityAttribute & Document;

export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'ha_entity_attributes' })
export class HaEntityAttribute {
  @Prop({ type: Types.ObjectId, required: true, ref: 'HaEntityState' })
  entityStateId: Types.ObjectId;

  @Prop({ required: true, index: true })
  attributeKey: string;

  @Prop({ type: Object, required: false, default: null })
  attributeValue: any;

  @Prop({ type: String, enum: Object.values(AttributeType), required: true })
  attributeType: AttributeType;
}

export const HaEntityAttributeSchema = SchemaFactory.createForClass(HaEntityAttribute);
