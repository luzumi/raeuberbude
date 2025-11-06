import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs/promises';
import { HaSnapshot, HaSnapshotDocument, SnapshotStatus } from '../schemas/ha-snapshot.schema';
import { HaArea, HaAreaDocument } from '../schemas/ha-area.schema';
import { HaDevice, HaDeviceDocument } from '../schemas/ha-device.schema';
import { HaEntity, HaEntityDocument, EntityType } from '../schemas/ha-entity.schema';
import { HaEntityState, HaEntityStateDocument } from '../schemas/ha-entity-state.schema';
import { HaEntityAttribute, HaEntityAttributeDocument, AttributeType } from '../schemas/ha-entity-attribute.schema';
import { HaPerson, HaPersonDocument } from '../schemas/ha-person.schema';
import { HaZone, HaZoneDocument } from '../schemas/ha-zone.schema';
import { HaAutomation, HaAutomationDocument, AutomationMode } from '../schemas/ha-automation.schema';
import { HaMediaPlayer, HaMediaPlayerDocument } from '../schemas/ha-media-player.schema';
import { HaService, HaServiceDocument } from '../schemas/ha-service.schema';

@Injectable()
export class HaImportService {
  private readonly logger = new Logger(HaImportService.name);

  constructor(
    @InjectModel(HaSnapshot.name) private readonly snapshotModel: Model<HaSnapshotDocument>,
    @InjectModel(HaArea.name) private readonly areaModel: Model<HaAreaDocument>,
    @InjectModel(HaDevice.name) private readonly deviceModel: Model<HaDeviceDocument>,
    @InjectModel(HaEntity.name) private readonly entityModel: Model<HaEntityDocument>,
    @InjectModel(HaEntityState.name) private readonly stateModel: Model<HaEntityStateDocument>,
    @InjectModel(HaEntityAttribute.name) private readonly attributeModel: Model<HaEntityAttributeDocument>,
    @InjectModel(HaPerson.name) private readonly personModel: Model<HaPersonDocument>,
    @InjectModel(HaZone.name) private readonly zoneModel: Model<HaZoneDocument>,
    @InjectModel(HaAutomation.name) private readonly automationModel: Model<HaAutomationDocument>,
    @InjectModel(HaMediaPlayer.name) private readonly mediaPlayerModel: Model<HaMediaPlayerDocument>,
    @InjectModel(HaService.name) private readonly serviceModel: Model<HaServiceDocument>,
  ) {}

  async getAllSnapshots(): Promise<HaSnapshot[]> {
    return this.snapshotModel.find().sort({ importDate: -1 }).lean().exec();
  }

  async getSnapshot(id: string): Promise<HaSnapshot> {
    return this.snapshotModel.findById(id).lean().exec();
  }

  async importFromFile(filePath: string): Promise<HaSnapshot> {
    this.logger.log(`Starting import from ${filePath}`);

    let snapshotDoc: any;

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Create snapshot
      snapshotDoc = await this.createSnapshot(data);

      // Import data in order
      await this.importAreas(data.areas || []);
      await this.importDevices(data.devices || []);
      await this.importEntities(data.entities || {}, snapshotDoc._id);
      await this.importServices(data.services || {});

      // Mark snapshot completed
      await this.snapshotModel.updateOne(
        { _id: snapshotDoc._id },
        { $set: { status: SnapshotStatus.COMPLETED } }
      ).exec();

      this.logger.log(`Import completed successfully for snapshot ${snapshotDoc._id}`);
      return await this.snapshotModel.findById(snapshotDoc._id).lean().exec();
    } catch (error: any) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);
      if (snapshotDoc?._id) {
        await this.snapshotModel.updateOne(
          { _id: snapshotDoc._id },
          { $set: { status: SnapshotStatus.FAILED, errorLog: error.message } }
        ).exec();
      }
      throw error;
    }
  }

  private async createSnapshot(data: any): Promise<HaSnapshotDocument> {
    const snap = new this.snapshotModel({
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      haVersion: data.home_assistant_version,
      status: SnapshotStatus.PROCESSING,
    });
    return await snap.save();
  }

  private async importAreas(areas: any[]): Promise<void> {
    for (const area of areas) {
      const areaId = area.area_id || area.id;
      if (!areaId) continue;
      await this.areaModel.updateOne(
        { areaId },
        {
          $set: {
            name: area.name,
            aliases: area.aliases,
            floor: area.floor,
            icon: area.icon,
          },
        },
        { upsert: true }
      ).exec();
    }
  }

  private async importDevices(devices: any[]): Promise<void> {
    for (const device of devices) {
      const deviceId = device.id || device.device_id;
      if (!deviceId) continue;
      await this.deviceModel.updateOne(
        { deviceId },
        {
          $set: {
            name: device.name,
            manufacturer: device.manufacturer,
            model: device.model,
            swVersion: device.sw_version,
            configurationUrl: device.configuration_url,
            connections: device.connections,
            identifiers: device.identifiers,
            viaDeviceId: device.via_device,
            areaId: device.area_id,
          },
        },
        { upsert: true }
      ).exec();
    }
  }

  private async importEntities(entities: any, snapshotId: Types.ObjectId,): Promise<void> {
    for (const [entityType, entityList] of Object.entries(entities)) {
      if (!Array.isArray(entityList)) continue;

      for (const entityData of entityList) {
        const entityId: string = entityData.entity_id;
        if (!entityId) continue;

        // Upsert entity (insert or update)
        const [domain, objectId] = entityId.split('.');
        await this.entityModel.updateOne(
          { entityId },
          {
            $set: {
              entityType: entityType as EntityType,
              domain,
              objectId,
              friendlyName: entityData.friendly_name || entityData.attributes?.friendly_name,
              deviceId: entityData.device_id,
              areaId: entityData.area_id,
            },
          },
          { upsert: true }
        ).exec();

        // Create entity state (uses entityId string and snapshot _id)
        const stateDoc = await this.stateModel.create({
          entityId: entityId,
          snapshotId,
          state: entityData.state,
          stateClass: entityData.attributes?.state_class,
          lastChanged: entityData.last_changed ? new Date(entityData.last_changed) : undefined,
          lastUpdated: entityData.last_updated ? new Date(entityData.last_updated) : undefined,
        });

        // Import attributes
        if (entityData.attributes) {
          await this.importAttributes(entityData.attributes, stateDoc._id);
        }

        // Import specialized entity data
        await this.importSpecializedEntity(entityId, entityData, entityType);
      }
    }
  }

  private async importAttributes(attributes: any, entityStateId: unknown): Promise<void> {
    const ops: any[] = [];
    for (const [key, value] of Object.entries(attributes)) {
      const attributeType = this.getAttributeType(value);
      ops.push({
        entityStateId,
        attributeKey: key,
        attributeValue: value,
        attributeType,
      });
    }
    if (ops.length) {
      await this.attributeModel.insertMany(ops);
    }
  }

  private getAttributeType(value: any): AttributeType {
    if (typeof value === 'string') return AttributeType.STRING;
    if (typeof value === 'number') return AttributeType.NUMBER;
    if (typeof value === 'boolean') return AttributeType.BOOLEAN;
    if (Array.isArray(value)) return AttributeType.ARRAY;
    return AttributeType.OBJECT;
  }

  private async importSpecializedEntity(entityId: string, data: any, entityType: string): Promise<void> {
    switch (entityType) {
      case 'person':
        await this.importPerson(entityId, data);
        break;
      case 'zone':
        await this.importZone(entityId, data);
        break;
      case 'automation':
        await this.importAutomation(entityId, data);
        break;
      case 'media_player':
        await this.importMediaPlayer(entityId, data);
        break;
    }
  }

  private async importPerson(entityId: string, data: any): Promise<void> {
    await this.personModel.updateOne(
      { entityId },
      {
        $set: {
          personId: data.attributes?.id || entityId.split('.')[1],
          name: data.friendly_name || data.attributes?.friendly_name,
          userId: data.attributes?.user_id,
          deviceTrackers: data.attributes?.device_trackers,
          latitude: data.attributes?.latitude,
          longitude: data.attributes?.longitude,
          gpsAccuracy: data.attributes?.gps_accuracy,
        },
      },
      { upsert: true }
    ).exec();
  }

  private async importZone(entityId: string, data: any): Promise<void> {
    await this.zoneModel.updateOne(
      { entityId },
      {
        $set: {
          zoneName: data.friendly_name || entityId.split('.')[1],
          latitude: data.attributes?.latitude,
          longitude: data.attributes?.longitude,
          radius: data.attributes?.radius,
          passive: data.attributes?.passive || false,
          persons: data.attributes?.persons,
          icon: data.attributes?.icon,
        },
      },
      { upsert: true }
    ).exec();
  }

  private async importAutomation(entityId: string, data: any): Promise<void> {
    await this.automationModel.updateOne(
      { entityId },
      {
        $set: {
          automationId: data.attributes?.id || entityId.split('.')[1],
          alias: data.attributes?.alias || data.friendly_name,
          description: data.attributes?.description,
          mode: (data.attributes?.mode || 'single') as AutomationMode,
          current: data.attributes?.current || 0,
          max: data.attributes?.max,
        },
      },
      { upsert: true }
    ).exec();
  }

  private async importMediaPlayer(entityId: string, data: any): Promise<void> {
    await this.mediaPlayerModel.updateOne(
      { entityId },
      {
        $set: {
          volumeLevel: data.attributes?.volume_level,
          isVolumeMuted: data.attributes?.is_volume_muted || false,
          mediaContentType: data.attributes?.media_content_type,
          mediaTitle: data.attributes?.media_title,
          mediaArtist: data.attributes?.media_artist,
          groupMembers: data.attributes?.group_members,
        },
      },
      { upsert: true }
    ).exec();
  }

  private async importServices(services: any): Promise<void> {
    for (const [domain, domainServices] of Object.entries(services)) {
      if (typeof domainServices !== 'object') continue;
      for (const [serviceName, serviceData] of Object.entries(domainServices as any)) {
        const fullName = `${domain}.${serviceName}`;
        await this.serviceModel.updateOne(
          { fullName },
          {
            $set: {
              domain,
              serviceName,
              description: (serviceData as any).description,
              fields: (serviceData as any).fields,
              target: (serviceData as any).target,
              responseOptional: (serviceData as any).response?.optional !== false,
            },
          },
          { upsert: true }
        ).exec();
      }
    }
  }
}
