import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HaEntityDocument = HaEntity & Document;

// Hinweis: Kein hartes Enum mehr, um alle HA-Domains/Typen zu unterstützen (z. B. 'update')
export type EntityType = string;

@Schema({ timestamps: true, collection: 'ha_entities' })
export class HaEntity {
  @Prop({ required: true, unique: true })
  entityId: string; // e.g., sensor.pixel_8_pro_battery_level

  @Prop({ type: String, required: true })
  entityType: EntityType;

  @Prop({ required: true })
  domain: string;

  @Prop({ required: true })
  objectId: string;

  @Prop()
  friendlyName?: string;

  @Prop()
  deviceId?: string; // HA device id

  @Prop()
  areaId?: string; // HA area id
}

export const HaEntitySchema = SchemaFactory.createForClass(HaEntity);
