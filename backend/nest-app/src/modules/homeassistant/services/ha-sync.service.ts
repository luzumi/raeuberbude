// ...existing code...
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HaEntity, HaEntityDocument } from '../schemas/ha-entity.schema';
import { HaEntityEntity } from '../entities/ha-entity.entity';

@Injectable()
export class HaSyncService {
  private readonly logger = new Logger(HaSyncService.name);

  constructor(
    @InjectModel(HaEntity.name) private readonly entityModel: Model<HaEntityDocument>,
    @InjectRepository(HaEntityEntity) private readonly haEntityRepository: Repository<HaEntityEntity>,
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
}

