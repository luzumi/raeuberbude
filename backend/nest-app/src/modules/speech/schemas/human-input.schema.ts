import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HumanInputDocument = HumanInput & Document;

@Schema({ timestamps: true })
export class HumanInput {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppTerminal' })
  terminalId?: Types.ObjectId;

  @Prop({ required: true })
  inputText: string;

  @Prop({ type: String, enum: ['speech', 'text', 'gesture'], default: 'speech' })
  inputType: string;

  @Prop({ type: Object })
  context?: {
    location?: string;
    device?: string;
    browser?: string;
    sessionId?: string;
    confidence?: number;
  };

  @Prop({ type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' })
  status: string;

  @Prop()
  processedResponse?: string;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const HumanInputSchema = SchemaFactory.createForClass(HumanInput);

// Indexes
HumanInputSchema.index({ userId: 1, createdAt: -1 });
HumanInputSchema.index({ terminalId: 1, createdAt: -1 });
HumanInputSchema.index({ status: 1 });
HumanInputSchema.index({ inputType: 1 });
