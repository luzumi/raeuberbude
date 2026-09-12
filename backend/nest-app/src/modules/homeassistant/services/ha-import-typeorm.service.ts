import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import { HaSnapshot } from '../entities/ha-snapshot.entity';
import { HaArea } from '../entities/ha-area.entity';
import { HaDevice } from '../entities/ha-device.entity';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { HaEntityState } from '../entities/ha-entity-state.entity';
import { HaEntityAttribute } from '../entities/ha-entity-attribute.entity';
import { HaPerson } from '../entities/ha-person.entity';

export enum SnapshotStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Home Assistant Import Service using TypeORM (MariaDB)
 *
 * This service replaces the MongoDB-based import service and writes
 * directly to MariaDB using TypeORM repositories.
 */
@Injectable()
export class HaImportTypeOrmService {
  private readonly logger = new Logger(HaImportTypeOrmService.name);

  constructor(
    @InjectRepository(HaSnapshot) private readonly snapshotRepo: Repository<HaSnapshot>,
    @InjectRepository(HaArea) private readonly areaRepo: Repository<HaArea>,
    @InjectRepository(HaDevice) private readonly deviceRepo: Repository<HaDevice>,
    @InjectRepository(HaEntityEntity) private readonly entityRepo: Repository<HaEntityEntity>,
    @InjectRepository(HaEntityState) private readonly stateRepo: Repository<HaEntityState>,
    @InjectRepository(HaEntityAttribute) private readonly attributeRepo: Repository<HaEntityAttribute>,
    @InjectRepository(HaPerson) private readonly personRepo: Repository<HaPerson>,
  ) {}

  /**
   * Get all snapshots, sorted by import date descending
   */
  async getAllSnapshots(): Promise<HaSnapshot[]> {
    return this.snapshotRepo.find({
      order: { importDate: 'DESC' },
    });
  }

  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(id: string): Promise<HaSnapshot | null> {
    return this.snapshotRepo.findOne({ where: { id } });
  }

  /**
   * Import Home Assistant data from JSON file
   */
  async importFromFile(filePath: string): Promise<HaSnapshot> {
    this.logger.log(`Starting import from ${filePath}`);

    let snapshot: HaSnapshot | null = null;

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Create snapshot
      snapshot = await this.createSnapshot(data);

      // Import data in order: areas first (no dependencies), then devices, then entities
      await this.importAreas(data.areas || []);
      await this.importDevices(data.devices || []);
      await this.importEntities(data.entities || {}, snapshot.id);

      // Mark snapshot as completed
      snapshot.status = SnapshotStatus.COMPLETED;
      await this.snapshotRepo.save(snapshot);

      this.logger.log(`Import completed successfully for snapshot ${snapshot.id}`);
      return snapshot;
    } catch (error: any) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);

      if (snapshot) {
        snapshot.status = SnapshotStatus.FAILED;
        snapshot.errorLog = error.message;
        await this.snapshotRepo.save(snapshot);
      }

      throw error;
    }
  }

  /**
   * Create a snapshot record
   */
  private async createSnapshot(data: any): Promise<HaSnapshot> {
    const snapshot = this.snapshotRepo.create({
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      haVersion: data.home_assistant_version || 'unknown',
      status: SnapshotStatus.PROCESSING,
      importDate: new Date(),
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Import areas with upsert logic
   */
  private async importAreas(areas: any[]): Promise<void> {
    this.logger.log(`Importing ${areas.length} areas...`);

    for (const areaData of areas) {
      const areaId = areaData.area_id || areaData.id;
      if (!areaId) {
        this.logger.warn('Skipping area without areaId:', areaData);
        continue;
      }

      try {
        await this.areaRepo.upsert(
          {
            areaId,
            name: areaData.name || areaId,
            floor: areaData.floor || null,
            icon: areaData.icon || null,
            aliases: areaData.aliases || null,
          },
          ['areaId']
        );
      } catch (error: any) {
        this.logger.error(`Failed to import area ${areaId}: ${error.message}`);
      }
    }

    this.logger.log(`Areas import completed`);
  }

  /**
   * Import devices with upsert logic
   */
  private async importDevices(devices: any[]): Promise<void> {
    this.logger.log(`Importing ${devices.length} devices...`);

    for (const deviceData of devices) {
      const deviceId = deviceData.id || deviceData.device_id;
      if (!deviceId) {
        this.logger.warn('Skipping device without deviceId:', deviceData);
        continue;
      }

      try {
        await this.deviceRepo.upsert(
          {
            deviceId,
            name: deviceData.name || deviceId,
            manufacturer: deviceData.manufacturer || null,
            model: deviceData.model || null,
            swVersion: deviceData.sw_version || null,
            configurationUrl: deviceData.configuration_url || null,
            connections: deviceData.connections || null,
            identifiers: deviceData.identifiers || null,
            viaDeviceId: deviceData.via_device_id || deviceData.via_device || null,
            areaId: deviceData.area_id || null,
          },
          ['deviceId']
        );
      } catch (error: any) {
        this.logger.error(`Failed to import device ${deviceId}: ${error.message}`);
      }
    }

    this.logger.log(`Devices import completed`);
  }

  /**
   * Import entities grouped by domain
   */
  private async importEntities(entitiesByDomain: any, snapshotId: string): Promise<void> {
    let totalCount = 0;

    for (const [domain, entityList] of Object.entries(entitiesByDomain)) {
      if (!Array.isArray(entityList)) continue;
      totalCount += entityList.length;
    }

    this.logger.log(`Importing ${totalCount} entities from ${Object.keys(entitiesByDomain).length} domains...`);

    for (const [domain, entityList] of Object.entries(entitiesByDomain)) {
      if (!Array.isArray(entityList)) continue;

      for (const entityData of entityList) {
        const entityId = entityData.entity_id;
        if (!entityId) {
          this.logger.warn('Skipping entity without entity_id:', entityData);
          continue;
        }

        try {
          // Split entity_id to get domain and object_id
          const [entityDomain, objectId] = entityId.split('.');

          // Upsert entity
          await this.entityRepo.upsert(
            {
              entityId,
              domain: entityDomain || domain,
              objectId: objectId || null,
              friendlyName: entityData.friendly_name || entityData.attributes?.friendly_name || null,
              deviceClass: entityData.attributes?.device_class || null,
              deviceId: entityData.device_id || null,
              areaId: entityData.area_id || null,
              platform: entityData.platform || null,
              uniqueId: entityData.unique_id || null,
              supportedFeatures: entityData.supported_features || null,
              entityCategory: entityData.entity_category || null,
              capabilities: entityData.capabilities || null,
              originalName: entityData.original_name || null,
            },
            ['entityId']
          );

          // Create entity state
          if (entityData.state !== undefined) {
            const state = this.stateRepo.create({
              entityId,
              snapshotId,
              state: String(entityData.state),
              timestamp: entityData.last_updated ? new Date(entityData.last_updated) : new Date(),
            });

            const savedState = await this.stateRepo.save(state);

            // Import attributes
            if (entityData.attributes) {
              await this.importAttributes(entityData.attributes, String(savedState.id));
            }
          }

          // Import specialized entity data (person, etc.)
          await this.importSpecializedEntity(entityId, entityData, domain);
        } catch (error: any) {
          this.logger.error(`Failed to import entity ${entityId}: ${error.message}`);
        }
      }
    }

    this.logger.log(`Entities import completed`);
  }

  /**
   * Import entity attributes
   */
  private async importAttributes(attributes: any, entityId: string): Promise<void> {
    const attributesToSave: any[] = [];

    for (const [key, value] of Object.entries(attributes)) {
      // Skip some common large attributes
      if (key === 'entity_picture' || key === 'icon') continue;

      attributesToSave.push(
        this.attributeRepo.create({
          entityId,
          attributeKey: key,
          attributeValue: String(value),
        })
      );
    }

    if (attributesToSave.length > 0) {
      // Save in batches to avoid too many queries
      const batchSize = 100;
      for (let i = 0; i < attributesToSave.length; i += batchSize) {
        const batch = attributesToSave.slice(i, i + batchSize);
        await this.attributeRepo.save(batch);
      }
    }
  }

  /**
   * Determine attribute type
   */
  private getAttributeType(value: any): AttributeType {
    if (typeof value === 'string') return AttributeType.STRING;
    if (typeof value === 'number') return AttributeType.NUMBER;
    if (typeof value === 'boolean') return AttributeType.BOOLEAN;
    if (Array.isArray(value)) return AttributeType.ARRAY;
    return AttributeType.OBJECT;
  }

  /**
   * Import specialized entity types (person, zone, automation, etc.)
   */
  private async importSpecializedEntity(entityId: string, data: any, entityType: string): Promise<void> {
    switch (entityType) {
      case 'person':
        await this.importPerson(entityId, data);
        break;
      // Add more specialized types as needed (zone, automation, media_player, etc.)
    }
  }

  /**
   * Import person entity
   */
  private async importPerson(entityId: string, data: any): Promise<void> {
    try {
      const personData: any = {
        personId: data.attributes?.id || entityId.split('.')[1],
        name: data.friendly_name || data.attributes?.friendly_name || null,
        userId: data.attributes?.user_id || null,
        deviceTrackers: data.attributes?.device_trackers || null,
        latitude: data.attributes?.latitude || null,
        longitude: data.attributes?.longitude || null,
        gpsAccuracy: data.attributes?.gps_accuracy || null,
      };

      await this.personRepo.upsert(personData, ['personId']);
    } catch (error: any) {
      this.logger.error(`Failed to import person ${entityId}: ${error.message}`);
    }
  }
}


