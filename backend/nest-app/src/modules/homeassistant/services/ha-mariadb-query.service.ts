import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { HaDevice } from '../entities/ha-device.entity';
import { HaArea } from '../entities/ha-area.entity';

/**
 * Query Service for Home Assistant data from MariaDB (TypeORM)
 *
 * This service provides read operations for HA entities, devices, and areas
 * from the MariaDB database.
 */
@Injectable()
export class HaMariaDbQueryService {
  private readonly logger = new Logger(HaMariaDbQueryService.name);

  constructor(
    @InjectRepository(HaEntityEntity) private readonly entityRepo: Repository<HaEntityEntity>,
    @InjectRepository(HaDevice) private readonly deviceRepo: Repository<HaDevice>,
    @InjectRepository(HaArea) private readonly areaRepo: Repository<HaArea>,
  ) {}

  /**
   * Get all entities, optionally filtered by domain
   */
  async getAllEntities(domain?: string): Promise<HaEntityEntity[]> {
    if (domain) {
      return this.entityRepo.find({ where: { domain } });
    }
    return this.entityRepo.find();
  }

  /**
   * Get entity by entity_id
   */
  async getEntityById(entityId: string): Promise<HaEntityEntity | null> {
    return this.entityRepo.findOne({ where: { entityId } });
  }

  /**
   * Search entities by friendly name or entity_id
   */
  async searchEntities(searchTerm: string): Promise<HaEntityEntity[]> {
    return this.entityRepo
      .createQueryBuilder('entity')
      .where('entity.friendlyName LIKE :term OR entity.entityId LIKE :term', {
        term: `%${searchTerm}%`,
      })
      .getMany();
  }

  /**
   * Get all devices
   */
  async getAllDevices(): Promise<HaDevice[]> {
    return this.deviceRepo.find();
  }

  /**
   * Get device by device_id
   */
  async getDeviceById(deviceId: string): Promise<HaDevice | null> {
    return this.deviceRepo.findOne({ where: { deviceId } });
  }

  /**
   * Get device with its entities
   */
  async getDeviceWithEntities(deviceId: string): Promise<any> {
    const device = await this.deviceRepo.findOne({ where: { deviceId } });
    if (!device) return null;

    const entities = await this.entityRepo.find({ where: { deviceId } });
    return { ...device, entities };
  }

  /**
   * Get all areas
   */
  async getAllAreas(): Promise<HaArea[]> {
    return this.areaRepo.find();
  }

  /**
   * Get area by area_id
   */
  async getAreaById(areaId: string): Promise<HaArea | null> {
    return this.areaRepo.findOne({ where: { areaId } });
  }

  /**
   * Get area with its devices and entities
   */
  async getAreaWithDevicesAndEntities(areaId: string): Promise<any> {
    const area = await this.areaRepo.findOne({ where: { areaId } });
    if (!area) return null;

    const devices = await this.deviceRepo.find({ where: { areaId } });
    const entities = await this.entityRepo.find({ where: { areaId } });

    return { ...area, devices, entities };
  }

  /**
   * Get entities by area
   */
  async getEntitiesByArea(areaId: string): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { areaId } });
  }

  /**
   * Get entities by device
   */
  async getEntitiesByDevice(deviceId: string): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { deviceId } });
  }

  /**
   * Get statistics about entities, devices, and areas
   */
  async getStatistics(): Promise<any> {
    const [entityCount, deviceCount, areaCount] = await Promise.all([
      this.entityRepo.count(),
      this.deviceRepo.count(),
      this.areaRepo.count(),
    ]);

    // Get entity counts by domain
    const entityByDomain = await this.entityRepo
      .createQueryBuilder('entity')
      .select('entity.domain', 'domain')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entity.domain')
      .getRawMany();

    return {
      total: {
        entities: entityCount,
        devices: deviceCount,
        areas: areaCount,
      },
      entityByDomain: entityByDomain.reduce((acc, item) => {
        acc[item.domain] = parseInt(item.count, 10);
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

