import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaAreaDocument = HaArea & Document;

@Schema({ timestamps: true, collection: 'ha_areas' })
export class HaArea {
  @Prop({ required: true, unique: true })
  areaId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], required: false })
  aliases?: string[];

  @Prop({ required: false })
  floor?: string;

  @Prop({ required: false })
  icon?: string;
}

export const HaAreaSchema = SchemaFactory.createForClass(HaArea);
