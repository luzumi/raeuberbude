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
   * Get all persons (from HaPerson table)
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
   * Get all zones (from ha_entities with domain=zone)
   */
  async getAllZones(): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { domain: 'zone' } });
  }

  /**
   * Get all entities for a specific domain
   * Unterstützt alle 27 Domänen: automation, binary_sensor, button, calendar, conversation,
   * device_tracker, event, image, input_boolean, input_number, input_select, light,
   * media_player, number, person, remote, script, select, sensor, stt, sun, switch,
   * todo, tts, update, weather, zone
   */
  async getEntitiesByDomain(domain: string): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({
      where: { domain },
      order: { friendlyName: 'ASC' }
    });
  }

  /**
   * Get all lights (domain=light)
   */
  async getAllLights(): Promise<HaEntityEntity[]> {
    return this.getEntitiesByDomain('light');
  }

  /**
   * Get all switches (domain=switch)
   */
  async getAllSwitches(): Promise<HaEntityEntity[]> {
    return this.getEntitiesByDomain('switch');
  }

  /**
   * Get all sensors (domain=sensor)
   */
  async getAllSensors(): Promise<HaEntityEntity[]> {
    return this.getEntitiesByDomain('sensor');
  }

  /**
   * Get all binary sensors (domain=binary_sensor)
   */
  async getAllBinarySensors(): Promise<HaEntityEntity[]> {
    return this.getEntitiesByDomain('binary_sensor');
  }

  /**
   * Get all available domains from the database
   */
  async getAllDomains(): Promise<{ domain: string; count: number }[]> {
    const result = await this.entityRepo
      .createQueryBuilder('entity')
      .select('entity.domain', 'domain')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entity.domain')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return result.map(row => ({
      domain: row.domain,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Get zone by entity_id
   */
  async getZoneById(zoneId: string): Promise<HaEntityEntity | null> {
    return this.entityRepo.findOne({ where: { entityId: zoneId, domain: 'zone' } });
  }

  /**
   * Get persons in zone (from ha_entities with domain=person, filtered by area)
   */
  async getPersonsInZone(zoneName: string): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { domain: 'person', area: zoneName } });
  }

  /**
   * Get all automations (from ha_entities with domain=automation)
   */
  async getAllAutomations(): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { domain: 'automation' } });
  }

  /**
   * Get active automations (from ha_entities with domain=automation)
   * Note: State info would need to be checked in ha_entity_states table
   */
  async getActiveAutomations(): Promise<HaEntityEntity[]> {
    // TODO: Join with ha_entity_states to filter by state='on'
    return this.entityRepo.find({ where: { domain: 'automation' } });
  }

  /**
   * Get automation by entity_id
   */
  async getAutomationById(automationId: string): Promise<HaEntityEntity | null> {
    return this.entityRepo.findOne({ where: { entityId: automationId, domain: 'automation' } });
  }

  /**
   * Get all media players (from ha_entities with domain=media_player)
   */
  async getAllMediaPlayers(): Promise<HaEntityEntity[]> {
    return this.entityRepo.find({ where: { domain: 'media_player' } });
  }

  /**
   * Get active media players (from ha_entities with domain=media_player)
   * Note: State info would need to be checked in ha_entity_states table
   */
  async getActiveMediaPlayers(): Promise<HaEntityEntity[]> {
    // TODO: Join with ha_entity_states to filter by state='playing'
    return this.entityRepo.find({ where: { domain: 'media_player' } });
  }

  /**
   * Get media player by entity_id
   */
  async getMediaPlayerById(entityId: string): Promise<HaEntityEntity | null> {
    return this.entityRepo.findOne({ where: { entityId, domain: 'media_player' } });
  }

  /**
   * Get all services
   * Note: Services are not stored in the database, they come from Home Assistant API
   */
  async getAllServices(): Promise<any[]> {
    // TODO: Fetch from Home Assistant API /api/services
    this.logger.warn('getAllServices not implemented - services are not stored in DB');
    return [];
  }

  /**
   * Get services by domain
   * Note: Services are not stored in the database, they come from Home Assistant API
   */
  async getServicesByDomain(domain: string): Promise<any[]> {
    // TODO: Fetch from Home Assistant API /api/services/${domain}
    this.logger.warn(`getServicesByDomain(${domain}) not implemented - services are not stored in DB`);
    return [];
  }

  /**
   * Get service
   * Note: Services are not stored in the database, they come from Home Assistant API
   */
  async getService(domain: string, service: string): Promise<any> {
    // TODO: Fetch from Home Assistant API /api/services/${domain}/${service}
    this.logger.warn(`getService(${domain}, ${service}) not implemented - services are not stored in DB`);
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
