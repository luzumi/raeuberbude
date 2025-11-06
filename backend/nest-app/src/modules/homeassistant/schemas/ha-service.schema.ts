import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaServiceDocument = HaService & Document;

@Schema({ timestamps: true, collection: 'ha_services' })
export class HaService {
  @Prop({ required: true })
  domain: string;

  @Prop({ required: true })
  serviceName: string;

  @Prop({ required: true, unique: true })
  fullName: string; // domain.service

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Object })
  fields?: any;

  @Prop({ type: Object })
  target?: any;

  @Prop({ type: Boolean, default: true })
  responseOptional?: boolean;
}

export const HaServiceSchema = SchemaFactory.createForClass(HaService);
