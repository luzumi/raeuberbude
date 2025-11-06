import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaDeviceDocument = HaDevice & Document;

@Schema({ timestamps: true, collection: 'ha_devices' })
export class HaDevice {
  @Prop({ required: true, unique: true })
  deviceId: string; // HA device id

  @Prop()
  name?: string;

  @Prop()
  manufacturer?: string;

  @Prop()
  model?: string;

  @Prop()
  swVersion?: string;

  @Prop()
  configurationUrl?: string;

  @Prop({ type: [Object], required: false })
  connections?: any[];

  @Prop({ type: [Object], required: false })
  identifiers?: any[];

  @Prop({ required: false })
  viaDeviceId?: string;

  @Prop({ required: false })
  areaId?: string; // HA area id
}

export const HaDeviceSchema = SchemaFactory.createForClass(HaDevice);
