"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaQueryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ha_entity_schema_1 = require("../schemas/ha-entity.schema");
const ha_entity_state_schema_1 = require("../schemas/ha-entity-state.schema");
const ha_entity_attribute_schema_1 = require("../schemas/ha-entity-attribute.schema");
const ha_device_schema_1 = require("../schemas/ha-device.schema");
const ha_area_schema_1 = require("../schemas/ha-area.schema");
const ha_person_schema_1 = require("../schemas/ha-person.schema");
const ha_zone_schema_1 = require("../schemas/ha-zone.schema");
const ha_automation_schema_1 = require("../schemas/ha-automation.schema");
const ha_media_player_schema_1 = require("../schemas/ha-media-player.schema");
const ha_service_schema_1 = require("../schemas/ha-service.schema");
let HaQueryService = class HaQueryService {
    constructor(entityModel, stateModel, deviceModel, areaModel, attributeModel, personModel, zoneModel, automationModel, mediaPlayerModel, serviceModel) {
        this.entityModel = entityModel;
        this.stateModel = stateModel;
        this.deviceModel = deviceModel;
        this.areaModel = areaModel;
        this.attributeModel = attributeModel;
        this.personModel = personModel;
        this.zoneModel = zoneModel;
        this.automationModel = automationModel;
        this.mediaPlayerModel = mediaPlayerModel;
        this.serviceModel = serviceModel;
    }
    async getAllEntities(type) {
        const filter = {};
        if (type)
            filter.entityType = type;
        const entities = await this.entityModel.find(filter).lean().exec();
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
    async getEntityById(entityId) {
        const entity = await this.entityModel.findOne({ entityId }).lean().exec();
        if (!entity)
            return null;
        const [device, area] = await Promise.all([
            entity.deviceId ? this.deviceModel.findOne({ deviceId: entity.deviceId }).lean().exec() : null,
            entity.areaId ? this.areaModel.findOne({ areaId: entity.areaId }).lean().exec() : null,
        ]);
        return { ...entity, device, area };
    }
    async getEntityCurrentState(entityId) {
        const state = await this.stateModel.findOne({ entityId }).sort({ createdAt: -1 }).lean().exec();
        if (!state)
            return null;
        const attributes = await this.getAttributesForState(state._id.toString());
        return { ...state, attributes };
    }
    async getEntityStateHistory(entityId, startDate, endDate) {
        const filter = { entityId };
        if (startDate && endDate)
            filter.createdAt = { $gte: startDate, $lte: endDate };
        const states = await this.stateModel.find(filter).sort({ createdAt: -1 }).lean().exec();
        const ids = states.map(s => s._id);
        const attrs = await this.attributeModel.find({ entityStateId: { $in: ids } }).lean().exec();
        const attrMap = new Map();
        for (const a of attrs) {
            const key = a.entityStateId.toString();
            if (!attrMap.has(key))
                attrMap.set(key, []);
            attrMap.get(key).push(a);
        }
        return states.map(s => ({ ...s, attributes: attrMap.get(s._id.toString()) || [] }));
    }
    async getAttributesForState(stateId) {
        return this.attributeModel.find({ entityStateId: stateId }).lean().exec();
    }
    async getAllDevices() {
        return this.deviceModel.find().lean().exec();
    }
    async getDeviceById(deviceId) {
        const device = await this.deviceModel.findOne({ deviceId }).lean().exec();
        if (!device)
            return null;
        const entities = await this.entityModel.find({ deviceId }).lean().exec();
        return { ...device, entities };
    }
    async getDevicesByArea(areaId) {
        const devices = await this.deviceModel.find({ areaId }).lean().exec();
        if (!devices.length)
            return [];
        const ids = devices.map(d => d.deviceId);
        const entities = await this.entityModel.find({ deviceId: { $in: ids } }).lean().exec();
        const eMap = new Map(ids.map(id => [id, []]));
        for (const e of entities) {
            if (!eMap.has(e.deviceId))
                eMap.set(e.deviceId, []);
            eMap.get(e.deviceId).push(e);
        }
        return devices.map(d => ({ ...d, entities: eMap.get(d.deviceId) || [] }));
    }
    async getAllAreas() {
        return this.areaModel.find().lean().exec();
    }
    async getAreaById(areaId) {
        const area = await this.areaModel.findOne({ areaId }).lean().exec();
        if (!area)
            return null;
        const [devices, entities] = await Promise.all([
            this.deviceModel.find({ areaId }).lean().exec(),
            this.entityModel.find({ areaId }).lean().exec(),
        ]);
        return { ...area, devices, entities };
    }
    async getAllPersons() {
        return this.personModel.find().lean().exec();
    }
    async getPersonById(personId) {
        const person = await this.personModel.findOne({ personId }).lean().exec();
        if (!person)
            return null;
        const states = await this.stateModel.find({ entityId: person.entityId }).sort({ createdAt: -1 }).lean().exec();
        return { ...person, states };
    }
    async getPersonLocation(personId) {
        const person = await this.personModel.findOne({ personId }).lean().exec();
        if (!person)
            return null;
        return { latitude: person.latitude, longitude: person.longitude, accuracy: person.gpsAccuracy };
    }
    async getAllZones() {
        return this.zoneModel.find().lean().exec();
    }
    async getZoneById(zoneId) {
        return this.zoneModel.findOne({ entityId: zoneId }).lean().exec();
    }
    async getPersonsInZone(zoneName) {
        const zone = await this.zoneModel.findOne({ zoneName }).lean().exec();
        return zone?.persons || [];
    }
    async getAllAutomations() {
        return this.automationModel.find().lean().exec();
    }
    async getAutomationById(automationId) {
        const automation = await this.automationModel.findOne({ automationId }).lean().exec();
        if (!automation)
            return null;
        const states = await this.stateModel.find({ entityId: automation.entityId }).sort({ createdAt: -1 }).lean().exec();
        return { ...automation, states };
    }
    async getActiveAutomations() {
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
    async getAllMediaPlayers() {
        return this.mediaPlayerModel.find().lean().exec();
    }
    async getMediaPlayerById(entityId) {
        const player = await this.mediaPlayerModel.findOne({ entityId }).lean().exec();
        if (!player)
            return null;
        const states = await this.stateModel.find({ entityId }).sort({ createdAt: -1 }).lean().exec();
        return { ...player, states };
    }
    async getActiveMediaPlayers() {
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
    async getAllServices() {
        return this.serviceModel.find().lean().exec();
    }
    async getServicesByDomain(domain) {
        return this.serviceModel.find({ domain }).lean().exec();
    }
    async getService(domain, serviceName) {
        return this.serviceModel.findOne({ domain, serviceName }).lean().exec();
    }
    async searchEntities(searchTerm) {
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
    async getStatistics() {
        const [totalEntities, totalDevices, totalAreas, totalAutomations, totalPersons, totalZones, totalMediaPlayers, totalServices] = await Promise.all([
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
};
exports.HaQueryService = HaQueryService;
exports.HaQueryService = HaQueryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ha_entity_schema_1.HaEntity.name)),
    __param(1, (0, mongoose_1.InjectModel)(ha_entity_state_schema_1.HaEntityState.name)),
    __param(2, (0, mongoose_1.InjectModel)(ha_device_schema_1.HaDevice.name)),
    __param(3, (0, mongoose_1.InjectModel)(ha_area_schema_1.HaArea.name)),
    __param(4, (0, mongoose_1.InjectModel)(ha_entity_attribute_schema_1.HaEntityAttribute.name)),
    __param(5, (0, mongoose_1.InjectModel)(ha_person_schema_1.HaPerson.name)),
    __param(6, (0, mongoose_1.InjectModel)(ha_zone_schema_1.HaZone.name)),
    __param(7, (0, mongoose_1.InjectModel)(ha_automation_schema_1.HaAutomation.name)),
    __param(8, (0, mongoose_1.InjectModel)(ha_media_player_schema_1.HaMediaPlayer.name)),
    __param(9, (0, mongoose_1.InjectModel)(ha_service_schema_1.HaService.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], HaQueryService);
//# sourceMappingURL=ha-query.service.js.map