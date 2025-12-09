import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HaEntity, HaEntityDocument } from '../schemas/ha-entity.schema';
import { HaDevice, HaDeviceDocument } from '../schemas/ha-device.schema';
import { HaArea, HaAreaDocument } from '../schemas/ha-area.schema';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { HaDevice as HaDeviceEntity } from '../entities/ha-device.entity';
import { HaArea as HaAreaEntity } from '../entities/ha-area.entity';

@Injectable()
export class HaSyncService {
  private readonly logger = new Logger(HaSyncService.name);

  constructor(
    @InjectModel(HaEntity.name) private readonly entityModel: Model<HaEntityDocument>,
    @InjectModel(HaDevice.name) private readonly deviceModel: Model<HaDeviceDocument>,
    @InjectModel(HaArea.name) private readonly areaModel: Model<HaAreaDocument>,
    @InjectRepository(HaEntityEntity) private readonly haEntityRepository: Repository<HaEntityEntity>,
    @InjectRepository(HaDeviceEntity) private readonly haDeviceRepository: Repository<HaDeviceEntity>,
    @InjectRepository(HaAreaEntity) private readonly haAreaRepository: Repository<HaAreaEntity>,
  ) {}

  /**
   * Sync all HA entities from Mongo -> MariaDB using upsert in batches.
   */
  async syncEntities(batchSize = 500): Promise<{ total: number; upserted: number }> {
    this.logger.log('Start syncing HA entities from Mongo to MariaDB...');
    const mongoColl = this.entityModel.collection;
    const total = await mongoColl.countDocuments();
    this.logger.log(`Found ${total} HA entities in Mongo`);

    const cursor = mongoColl.find().batchSize(batchSize);
    const batch: any[] = [];
    let processed = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const mapped = {
        entityId: doc.entityId || doc.entity_id || null,
        entityType: doc.entityType || doc.entity_type || null,
        domain: doc.domain || null,
        objectId: doc.objectId || doc.object_id || null,
        friendlyName: doc.friendlyName || doc.friendly_name || null,
        deviceId: doc.deviceId || doc.device_id || null,
        areaId: doc.areaId || doc.area_id || null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
      };

      batch.push(mapped);
      if (batch.length >= batchSize) {
        await this.flushBatch(batch);
        processed += batch.length;
        this.logger.log(`Synced ${processed}/${total}`);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await this.flushBatch(batch);
      processed += batch.length;
    }

    this.logger.log(`Sync completed. Processed ${processed} entities.`);
    return { total, upserted: processed };
  }

  private async flushBatch(batch: any[]) {
    // Use TypeORM upsert -- conflict column is entityId
    try {
      await this.haEntityRepository.upsert(batch, ['entityId']);
    } catch (e: any) {
      this.logger.error('Error during batch upsert: ' + e.message);
      // fallback: try to upsert one-by-one
      for (const item of batch) {
        try {
          await this.haEntityRepository.upsert(item, ['entityId']);
        } catch (err: any) {
          this.logger.error('Failed upsert single entity ' + item.entityId + ' : ' + err.message);
        }
      }
    }
  }

  /**
   * Sync all HA devices from Mongo -> MariaDB using upsert in batches.
   */
  async syncDevices(batchSize = 500): Promise<{ total: number; upserted: number }> {
    this.logger.log('Start syncing HA devices from Mongo to MariaDB...');
    const mongoColl = this.deviceModel.collection;
    const total = await mongoColl.countDocuments();
    this.logger.log(`Found ${total} HA devices in Mongo`);

    const cursor = mongoColl.find().batchSize(batchSize);
    const batch: any[] = [];
    let processed = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const mapped = {
        deviceId: doc.deviceId || doc.device_id || doc.id || null,
        name: doc.name || null,
        manufacturer: doc.manufacturer || null,
        model: doc.model || null,
        swVersion: doc.swVersion || doc.sw_version || null,
        configurationUrl: doc.configurationUrl || doc.configuration_url || null,
        connections: doc.connections || null,
        identifiers: doc.identifiers || null,
        viaDeviceId: doc.viaDeviceId || doc.via_device_id || doc.via_device || null,
        areaId: doc.areaId || doc.area_id || null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
      };

      // Skip if no deviceId
      if (!mapped.deviceId) continue;

      batch.push(mapped);
      if (batch.length >= batchSize) {
        await this.flushDeviceBatch(batch);
        processed += batch.length;
        this.logger.log(`Synced ${processed}/${total} devices`);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await this.flushDeviceBatch(batch);
      processed += batch.length;
    }

    this.logger.log(`Device sync completed. Processed ${processed} devices.`);
    return { total, upserted: processed };
  }

  private async flushDeviceBatch(batch: any[]) {
    try {
      await this.haDeviceRepository.upsert(batch, ['deviceId']);
    } catch (e: any) {
      this.logger.error('Error during device batch upsert: ' + e.message);
      // fallback: try to upsert one-by-one
      for (const item of batch) {
        try {
          await this.haDeviceRepository.upsert(item, ['deviceId']);
        } catch (err: any) {
          this.logger.error('Failed upsert single device ' + item.deviceId + ' : ' + err.message);
        }
      }
    }
  }

  /**
   * Sync all HA areas from Mongo -> MariaDB using upsert in batches.
   */
  async syncAreas(batchSize = 500): Promise<{ total: number; upserted: number }> {
    this.logger.log('Start syncing HA areas from Mongo to MariaDB...');
    const mongoColl = this.areaModel.collection;
    const total = await mongoColl.countDocuments();
    this.logger.log(`Found ${total} HA areas in Mongo`);

    const cursor = mongoColl.find().batchSize(batchSize);
    const batch: any[] = [];
    let processed = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const mapped = {
        areaId: doc.areaId || doc.area_id || doc.id || null,
        name: doc.name || null,
        floor: doc.floor || null,
        icon: doc.icon || null,
        aliases: doc.aliases || null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
      };

      // Skip if no areaId
      if (!mapped.areaId) continue;

      batch.push(mapped);
      if (batch.length >= batchSize) {
        await this.flushAreaBatch(batch);
        processed += batch.length;
        this.logger.log(`Synced ${processed}/${total} areas`);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await this.flushAreaBatch(batch);
      processed += batch.length;
    }

    this.logger.log(`Area sync completed. Processed ${processed} areas.`);
    return { total, upserted: processed };
  }

  private async flushAreaBatch(batch: any[]) {
    try {
      await this.haAreaRepository.upsert(batch, ['areaId']);
    } catch (e: any) {
      this.logger.error('Error during area batch upsert: ' + e.message);
      // fallback: try to upsert one-by-one
      for (const item of batch) {
        try {
          await this.haAreaRepository.upsert(item, ['areaId']);
        } catch (err: any) {
          this.logger.error('Failed upsert single area ' + item.areaId + ' : ' + err.message);
        }
      }
    }
  }

  /**
   * Sync all HA data (areas, devices, entities) from Mongo -> MariaDB
   */
  async syncAll(batchSize = 500): Promise<{
    areas: { total: number; upserted: number };
    devices: { total: number; upserted: number };
    entities: { total: number; upserted: number };
  }> {
    this.logger.log('Starting full HA sync (areas, devices, entities)...');

    // Sync in order: areas first (no dependencies), then devices (depend on areas), then entities (depend on devices)
    const areas = await this.syncAreas(batchSize);
    const devices = await this.syncDevices(batchSize);
    const entities = await this.syncEntities(batchSize);

    this.logger.log('Full HA sync completed.');
    return { areas, devices, entities };
  }
}
