import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HaEntity, HaEntityDocument } from '../schemas/ha-entity.schema';
import { HaEntityState, HaEntityStateDocument } from '../schemas/ha-entity-state.schema';
import { HaEntityAttribute, HaEntityAttributeDocument } from '../schemas/ha-entity-attribute.schema';
import { HaDevice, HaDeviceDocument } from '../schemas/ha-device.schema';
import { HaArea, HaAreaDocument } from '../schemas/ha-area.schema';
import { HaPerson, HaPersonDocument } from '../schemas/ha-person.schema';
import { HaZone, HaZoneDocument } from '../schemas/ha-zone.schema';
import { HaAutomation, HaAutomationDocument } from '../schemas/ha-automation.schema';
import { HaMediaPlayer, HaMediaPlayerDocument } from '../schemas/ha-media-player.schema';
import { HaService, HaServiceDocument } from '../schemas/ha-service.schema';

@Injectable()
export class HaQueryService {
  constructor(
    @InjectModel(HaEntity.name) private readonly entityModel: Model<HaEntityDocument>,
    @InjectModel(HaEntityState.name) private readonly stateModel: Model<HaEntityStateDocument>,
    @InjectModel(HaDevice.name) private readonly deviceModel: Model<HaDeviceDocument>,
    @InjectModel(HaArea.name) private readonly areaModel: Model<HaAreaDocument>,
    @InjectModel(HaEntityAttribute.name) private readonly attributeModel: Model<HaEntityAttributeDocument>,
    @InjectModel(HaPerson.name) private readonly personModel: Model<HaPersonDocument>,
    @InjectModel(HaZone.name) private readonly zoneModel: Model<HaZoneDocument>,
    @InjectModel(HaAutomation.name) private readonly automationModel: Model<HaAutomationDocument>,
    @InjectModel(HaMediaPlayer.name) private readonly mediaPlayerModel: Model<HaMediaPlayerDocument>,
    @InjectModel(HaService.name) private readonly serviceModel: Model<HaServiceDocument>,
  ) {}

  // Entity queries
  async getAllEntities(type?: string): Promise<any[]> {
    const filter: any = {};
    if (type) filter.entityType = type;
    const entities = await this.entityModel.find(filter).lean().exec();
    // Enrich with device and area objects
    const deviceIds = Array.from(new Set(entities.map(e => e.deviceId).filter(Boolean)));
    const areaIds = Array.from(new Set(entities.map(e => e.areaId).filter(Boolean)));
    const [devices, areas] = await Promise.all([
      deviceIds.length ? this.deviceModel.find({ deviceId: { $in: deviceIds } }).lean().exec() : Promise.resolve([]),
      areaIds.length ? this.areaModel.find({ areaId: { $in: areaIds } }).lean().exec() : Promise.resolve([]),
    ]);
    const dMap = new Map(devices.map(d => [d.deviceId, d]));
    const aMap = new Map(areas.map(a => [a.areaId, a]));
    return entities.map(e => ({ ...e, device: e.deviceId ? dMap.get(e.deviceId) : undefined, area: e.areaId ? aMap.get(e.areaId) : undefined }));
  }

  async getEntityById(entityId: string): Promise<any> {
    const entity = await this.entityModel.findOne({ entityId }).lean().exec();
    if (!entity) return null;
    const [device, area] = await Promise.all([
      entity.deviceId ? this.deviceModel.findOne({ deviceId: entity.deviceId }).lean().exec() : null,
      entity.areaId ? this.areaModel.findOne({ areaId: entity.areaId }).lean().exec() : null,
    ]);
    return { ...entity, device, area };
  }

  async getEntityCurrentState(entityId: string): Promise<any> {
    const state = await this.stateModel.findOne({ entityId }).sort({ createdAt: -1 }).lean().exec();
    if (!state) return null;
    const attributes = await this.getAttributesForState(state._id.toString());
    return { ...state, attributes };
  }

  async getEntityStateHistory(entityId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const filter: any = { entityId };
    if (startDate && endDate) filter.createdAt = { $gte: startDate, $lte: endDate };
    const states = await this.stateModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    const ids = states.map(s => s._id);
    const attrs = await this.attributeModel.find({ entityStateId: { $in: ids } }).lean().exec();
    const attrMap = new Map<string, any[]>();
    for (const a of attrs) {
      const key = a.entityStateId.toString();
      if (!attrMap.has(key)) attrMap.set(key, []);
      attrMap.get(key)!.push(a);
    }
    return states.map(s => ({ ...s, attributes: attrMap.get(s._id.toString()) || [] }));
  }

  private async getAttributesForState(stateId: string): Promise<any[]> {
    return this.attributeModel.find({ entityStateId: stateId }).lean().exec();
  }

  // Device queries
  async getAllDevices(): Promise<HaDevice[]> {
    return this.deviceModel.find().lean().exec();
  }

  async getDeviceById(deviceId: string): Promise<any> {
    const device = await this.deviceModel.findOne({ deviceId }).lean().exec();
    if (!device) return null;
    const entities = await this.entityModel.find({ deviceId }).lean().exec();
    return { ...device, entities };
  }

  async getDevicesByArea(areaId: string): Promise<any[]> {
    const devices = await this.deviceModel.find({ areaId }).lean().exec();
    if (!devices.length) return [];
    const ids = devices.map(d => d.deviceId);
    const entities = await this.entityModel.find({ deviceId: { $in: ids } }).lean().exec();
    const eMap = new Map(ids.map(id => [id, [] as any[]]));
    for (const e of entities) {
      if (!eMap.has(e.deviceId)) eMap.set(e.deviceId, []);
      eMap.get(e.deviceId)!.push(e);
    }
    return devices.map(d => ({ ...d, entities: eMap.get(d.deviceId) || [] }));
  }

  // Area queries
  async getAllAreas(): Promise<HaArea[]> {
    return this.areaModel.find().lean().exec();
  }

  async getAreaById(areaId: string): Promise<any> {
    const area = await this.areaModel.findOne({ areaId }).lean().exec();
    if (!area) return null;
    const [devices, entities] = await Promise.all([
      this.deviceModel.find({ areaId }).lean().exec(),
      this.entityModel.find({ areaId }).lean().exec(),
    ]);
    return { ...area, devices, entities };
  }

  // Person queries
  async getAllPersons(): Promise<HaPerson[]> {
    return this.personModel.find().lean().exec();
  }

  async getPersonById(personId: string): Promise<any> {
    const person = await this.personModel.findOne({ personId }).lean().exec();
    if (!person) return null;
    const states = await this.stateModel.find({ entityId: person.entityId }).sort({ createdAt: -1 }).lean().exec();
    return { ...person, states };
  }

  async getPersonLocation(personId: string): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    const person = await this.personModel.findOne({ personId }).lean().exec();
    if (!person) return null;
    return { latitude: person.latitude, longitude: person.longitude, accuracy: person.gpsAccuracy } as any;
  }

  // Zone queries
  async getAllZones(): Promise<HaZone[]> {
    return this.zoneModel.find().lean().exec();
  }

  async getZoneById(zoneId: string): Promise<HaZone | null> {
    return this.zoneModel.findOne({ entityId: zoneId }).lean().exec();
  }

  async getPersonsInZone(zoneName: string): Promise<string[]> {
    const zone = await this.zoneModel.findOne({ zoneName }).lean().exec();
    return zone?.persons || [];
  }

  // Automation queries
  async getAllAutomations(): Promise<HaAutomation[]> {
    return this.automationModel.find().lean().exec();
  }

  async getAutomationById(automationId: string): Promise<any> {
    const automation = await this.automationModel.findOne({ automationId }).lean().exec();
    if (!automation) return null;
    const states = await this.stateModel.find({ entityId: automation.entityId }).sort({ createdAt: -1 }).lean().exec();
    return { ...automation, states };
  }

  async getActiveAutomations(): Promise<any[]> {
    const automations = await this.automationModel.find().lean().exec();
    const byEntity = new Map(automations.map(a => [a.entityId, a]));
    const states = await this.stateModel.aggregate([
      { $match: { entityId: { $in: Array.from(byEntity.keys()) } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$entityId', state: { $first: '$state' }, doc: { $first: '$$ROOT' } } }
    ]).exec();
    const active = states.filter(s => s.state === 'on');
    return active.map(s => ({ ...byEntity.get(s._id), latestState: s.doc }));
  }

  // Media Player queries
  async getAllMediaPlayers(): Promise<HaMediaPlayer[]> {
    return this.mediaPlayerModel.find().lean().exec();
  }

  async getMediaPlayerById(entityId: string): Promise<any> {
    const player = await this.mediaPlayerModel.findOne({ entityId }).lean().exec();
    if (!player) return null;
    const states = await this.stateModel.find({ entityId }).sort({ createdAt: -1 }).lean().exec();
    return { ...player, states };
  }

  async getActiveMediaPlayers(): Promise<any[]> {
    const players = await this.mediaPlayerModel.find().lean().exec();
    const ids = players.map(p => p.entityId);
    const states = await this.stateModel.aggregate([
      { $match: { entityId: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$entityId', state: { $first: '$state' }, doc: { $first: '$$ROOT' } } }
    ]).exec();
    const active = states.filter(s => s.state !== 'off' && s.state !== 'unavailable');
    const map = new Map(players.map(p => [p.entityId, p]));
    return active.map(s => ({ ...map.get(s._id), latestState: s.doc }));
  }

  // Service queries
  async getAllServices(): Promise<HaService[]> {
    return this.serviceModel.find().lean().exec();
  }

  async getServicesByDomain(domain: string): Promise<HaService[]> {
    return this.serviceModel.find({ domain }).lean().exec();
  }

  async getService(domain: string, serviceName: string): Promise<HaService | null> {
    return this.serviceModel.findOne({ domain, serviceName }).lean().exec();
  }

  // Search functionality
  async searchEntities(searchTerm: string): Promise<any[]> {
    const regex = new RegExp(searchTerm, 'i');
    const entities = await this.entityModel.find({ $or: [{ entityId: regex }, { friendlyName: regex }] }).lean().exec();
    const deviceIds = Array.from(new Set(entities.map(e => e.deviceId).filter(Boolean)));
    const areaIds = Array.from(new Set(entities.map(e => e.areaId).filter(Boolean)));
    const [devices, areas] = await Promise.all([
      deviceIds.length ? this.deviceModel.find({ deviceId: { $in: deviceIds } }).lean().exec() : Promise.resolve([]),
      areaIds.length ? this.areaModel.find({ areaId: { $in: areaIds } }).lean().exec() : Promise.resolve([]),
    ]);
    const dMap = new Map(devices.map(d => [d.deviceId, d]));
    const aMap = new Map(areas.map(a => [a.areaId, a]));
    return entities.map(e => ({ ...e, device: e.deviceId ? dMap.get(e.deviceId) : undefined, area: e.areaId ? aMap.get(e.areaId) : undefined }));
  }

  // Statistics
  async getStatistics(): Promise<any> {
    const [
      totalEntities,
      totalDevices,
      totalAreas,
      totalAutomations,
      totalPersons,
      totalZones,
      totalMediaPlayers,
      totalServices
    ] = await Promise.all([
      this.entityModel.countDocuments().exec(),
      this.deviceModel.countDocuments().exec(),
      this.areaModel.countDocuments().exec(),
      this.automationModel.countDocuments().exec(),
      this.personModel.countDocuments().exec(),
      this.zoneModel.countDocuments().exec(),
      this.mediaPlayerModel.countDocuments().exec(),
      this.serviceModel.countDocuments().exec(),
    ]);

    const entitiesByType = await this.entityModel.aggregate([
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
    ]).exec();

    return {
      totalEntities,
      totalDevices,
      totalAreas,
      totalAutomations,
      totalPersons,
      totalZones,
      totalMediaPlayers,
      totalServices,
      entitiesByType,
    };
  }
}
