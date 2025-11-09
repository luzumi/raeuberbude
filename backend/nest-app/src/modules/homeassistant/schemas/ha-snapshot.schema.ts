import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaSnapshotDocument = HaSnapshot & Document;

export enum SnapshotStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: { createdAt: 'importDate', updatedAt: false }, collection: 'ha_snapshots' })
export class HaSnapshot {
  @Prop({ type: Date, required: true })
  timestamp: Date;

  @Prop({ type: String })
  haVersion: string;

  @Prop({ type: String, enum: Object.values(SnapshotStatus), default: SnapshotStatus.PENDING })
  status: SnapshotStatus;

  @Prop({ type: String, required: false })
  errorLog?: string;
}

export const HaSnapshotSchema = SchemaFactory.createForClass(HaSnapshot);
