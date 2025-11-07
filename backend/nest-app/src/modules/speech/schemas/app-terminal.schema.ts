import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppTerminalDocument = AppTerminal & Document;

@Schema({ timestamps: true })
export class AppTerminal {
  @Prop({ required: true, unique: true })
  terminalId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: ['browser', 'mobile', 'tablet', 'kiosk', 'smart-tv', 'other'], default: 'browser' })
  type: string;

  @Prop()
  location?: string;

  @Prop({ type: Object })
  capabilities?: {
    hasMicrophone?: boolean;
    hasCamera?: boolean;
    hasSpeaker?: boolean;
    hasDisplay?: boolean;
    supportsSpeechRecognition?: boolean;
  };

  @Prop({ type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' })
  status: string;

  @Prop({ type: Date })
  lastActiveAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedUserId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  allowedActions: string[];

  @Prop({ type: Object })
  settings?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AppTerminalSchema = SchemaFactory.createForClass(AppTerminal);

// Indexes
AppTerminalSchema.index({ terminalId: 1 });
AppTerminalSchema.index({ status: 1 });
AppTerminalSchema.index({ type: 1 });
AppTerminalSchema.index({ assignedUserId: 1 });
