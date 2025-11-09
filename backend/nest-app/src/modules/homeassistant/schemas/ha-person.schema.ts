import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaPersonDocument = HaPerson & Document;

@Schema({ timestamps: true, collection: 'ha_persons' })
export class HaPerson {
  @Prop({ required: true, unique: true })
  entityId: string; // reference to HaEntity.entityId

  @Prop({ required: true, unique: true })
  personId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  userId?: string;

  @Prop({ type: [String] })
  deviceTrackers?: string[];

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop({ type: Number })
  gpsAccuracy?: number;
}

export const HaPersonSchema = SchemaFactory.createForClass(HaPerson);
