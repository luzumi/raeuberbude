import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { HaDevice, HaArea, HaPerson } from '../entities';

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
    @InjectRepository(HaPerson) private readonly personRepo: Repository<HaPerson>,
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
   * Get devices by area
   */
  async getDevicesByArea(areaId: string): Promise<HaDevice[]> {
    return this.deviceRepo.find({ where: { areaId } });
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

  /**
   * Get all persons
   */
  async getAllPersons(): Promise<HaPerson[]> {
    return this.personRepo.find();
  }

  /**
   * Get person by person_id
   */
  async getPersonById(personId: string): Promise<HaPerson | null> {
    return this.personRepo.findOne({ where: { personId } });
  }

  /**
   * Get person location (returns the person with location attributes)
   */
  async getPersonLocation(personId: string): Promise<any> {
    const person = await this.getPersonById(personId);
    if (!person) return null;
    return {
      personId: person.personId,
      name: person.name,
      // TODO: Add latitude, longitude, gpsAccuracy when HaPerson entity is extended
    };
  }

  /**
   * Get all zones (stub - needs Zone entity)
   */
  async getAllZones(): Promise<any[]> {
    // TODO: Implement when HaZone entity is created
    return [];
  }

  /**
   * Get zone by ID (stub)
   */
  async getZoneById(zoneId: string): Promise<any> {
    // TODO: Implement when HaZone entity is created
    return null;
  }

  /**
   * Get persons in zone (stub)
   */
  async getPersonsInZone(zoneName: string): Promise<any[]> {
    // TODO: Implement when HaZone entity is created
    return [];
  }

  /**
   * Get all automations (stub)
   */
  async getAllAutomations(): Promise<any[]> {
    // TODO: Implement when HaAutomation entity is created
    return [];
  }

  /**
   * Get active automations (stub)
   */
  async getActiveAutomations(): Promise<any[]> {
    // TODO: Implement when HaAutomation entity is created
    return [];
  }

  /**
   * Get automation by ID (stub)
   */
  async getAutomationById(automationId: string): Promise<any> {
    // TODO: Implement when HaAutomation entity is created
    return null;
  }

  /**
   * Get all media players (stub)
   */
  async getAllMediaPlayers(): Promise<any[]> {
    // TODO: Implement when HaMediaPlayer entity is created
    return [];
  }

  /**
   * Get active media players (stub)
   */
  async getActiveMediaPlayers(): Promise<any[]> {
    // TODO: Implement when HaMediaPlayer entity is created
    return [];
  }

  /**
   * Get media player by ID (stub)
   */
  async getMediaPlayerById(entityId: string): Promise<any> {
    // TODO: Implement when HaMediaPlayer entity is created
    return null;
  }

  /**
   * Get all services (stub)
   */
  async getAllServices(): Promise<any[]> {
    // TODO: Implement when HaService entity is created
    return [];
  }

  /**
   * Get services by domain (stub)
   */
  async getServicesByDomain(domain: string): Promise<any[]> {
    // TODO: Implement when HaService entity is created
    return [];
  }

  /**
   * Get service (stub)
   */
  async getService(domain: string, service: string): Promise<any> {
    // TODO: Implement when HaService entity is created
    return null;
  }

  /**
   * Get entity current state (stub - needs HaEntityState support)
   */
  async getEntityCurrentState(entityId: string): Promise<any> {
    // TODO: Implement when state tracking is added
    return null;
  }

  /**
   * Get entity state history (stub)
   */
  async getEntityStateHistory(entityId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    // TODO: Implement when state history tracking is added
    return [];
  }
}
