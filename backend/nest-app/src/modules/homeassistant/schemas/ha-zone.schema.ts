import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaZoneDocument = HaZone & Document;

@Schema({ timestamps: true, collection: 'ha_zones' })
export class HaZone {
  @Prop({ required: true, unique: true })
  entityId: string; // HaEntity.entityId

  @Prop({ required: true })
  zoneName: string;

  @Prop({ type: Number, required: true })
  latitude: number;

  @Prop({ type: Number, required: true })
  longitude: number;

  @Prop({ type: Number, required: true })
  radius: number;

  @Prop({ type: Boolean, default: false })
  passive: boolean;

  @Prop({ type: [String], required: false })
  persons?: string[];

  @Prop({ required: false })
  icon?: string;
}

export const HaZoneSchema = SchemaFactory.createForClass(HaZone);
