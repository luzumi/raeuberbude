import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaAutomationDocument = HaAutomation & Document;

export enum AutomationMode {
  SINGLE = 'single',
  RESTART = 'restart',
  QUEUED = 'queued',
  PARALLEL = 'parallel',
}

@Schema({ timestamps: true, collection: 'ha_automations' })
export class HaAutomation {
  @Prop({ required: true, unique: true })
  entityId: string; // HaEntity.entityId

  @Prop({ required: true, unique: true })
  automationId: string;

  @Prop({ required: true })
  alias: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, enum: Object.values(AutomationMode), default: AutomationMode.SINGLE })
  mode: AutomationMode;

  @Prop({ type: Number, default: 0 })
  current: number;

  @Prop({ type: Number })
  max?: number;

  @Prop({ type: Object })
  triggers?: any;

  @Prop({ type: Object })
  conditions?: any;

  @Prop({ type: Object })
  actions?: any;
}

export const HaAutomationSchema = SchemaFactory.createForClass(HaAutomation);
