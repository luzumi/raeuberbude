import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestInputDocument = TestInput & Document;

@Schema({ collection: 'test_inputs', timestamps: true })
export class TestInput {
  @Prop({ required: true })
  transcript: string;

  @Prop({ required: true })
  audioData: string; // Base64 encoded audio

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TestInputSchema = SchemaFactory.createForClass(TestInput);

