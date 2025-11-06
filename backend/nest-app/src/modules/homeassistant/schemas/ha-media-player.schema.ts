import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaMediaPlayerDocument = HaMediaPlayer & Document;

@Schema({ timestamps: true, collection: 'ha_media_players' })
export class HaMediaPlayer {
  @Prop({ required: true, unique: true })
  entityId: string; // HaEntity.entityId

  @Prop({ type: Number })
  volumeLevel?: number;

  @Prop({ type: Boolean, default: false })
  isVolumeMuted?: boolean;

  @Prop()
  mediaContentType?: string;

  @Prop()
  mediaTitle?: string;

  @Prop()
  mediaArtist?: string;

  @Prop({ type: [String] })
  groupMembers?: string[];
}

export const HaMediaPlayerSchema = SchemaFactory.createForClass(HaMediaPlayer);
