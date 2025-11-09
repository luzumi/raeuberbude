import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HaEntityStateDocument = HaEntityState & Document;

@Schema({ timestamps: true, collection: 'ha_entity_states' })
export class HaEntityState {
  @Prop({ required: true })
  entityId: string; // HA entity_id string (e.g., sensor.xyz)

  @Prop({ type: Types.ObjectId, required: true, ref: 'HaSnapshot' })
  snapshotId: Types.ObjectId;

  @Prop()
  state?: string;

  @Prop()
  stateClass?: string;

  @Prop({ type: Date })
  lastChanged?: Date;

  @Prop({ type: Date })
  lastUpdated?: Date;
}

export const HaEntityStateSchema = SchemaFactory.createForClass(HaEntityState);
