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
var HaImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaImportService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const fs = require("fs/promises");
const ha_snapshot_schema_1 = require("../schemas/ha-snapshot.schema");
const ha_area_schema_1 = require("../schemas/ha-area.schema");
const ha_device_schema_1 = require("../schemas/ha-device.schema");
const ha_entity_schema_1 = require("../schemas/ha-entity.schema");
const ha_entity_state_schema_1 = require("../schemas/ha-entity-state.schema");
const ha_entity_attribute_schema_1 = require("../schemas/ha-entity-attribute.schema");
const ha_person_schema_1 = require("../schemas/ha-person.schema");
const ha_zone_schema_1 = require("../schemas/ha-zone.schema");
const ha_automation_schema_1 = require("../schemas/ha-automation.schema");
const ha_media_player_schema_1 = require("../schemas/ha-media-player.schema");
const ha_service_schema_1 = require("../schemas/ha-service.schema");
let HaImportService = HaImportService_1 = class HaImportService {
    constructor(snapshotModel, areaModel, deviceModel, entityModel, stateModel, attributeModel, personModel, zoneModel, automationModel, mediaPlayerModel, serviceModel) {
        this.snapshotModel = snapshotModel;
        this.areaModel = areaModel;
        this.deviceModel = deviceModel;
        this.entityModel = entityModel;
        this.stateModel = stateModel;
        this.attributeModel = attributeModel;
        this.personModel = personModel;
        this.zoneModel = zoneModel;
        this.automationModel = automationModel;
        this.mediaPlayerModel = mediaPlayerModel;
        this.serviceModel = serviceModel;
        this.logger = new common_1.Logger(HaImportService_1.name);
    }
    async getAllSnapshots() {
        return this.snapshotModel.find().sort({ importDate: -1 }).lean().exec();
    }
    async getSnapshot(id) {
        return this.snapshotModel.findById(id).lean().exec();
    }
    async importFromFile(filePath) {
        this.logger.log(`Starting import from ${filePath}`);
        let snapshotDoc;
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            snapshotDoc = await this.createSnapshot(data);
            await this.importAreas(data.areas || []);
            await this.importDevices(data.devices || []);
            await this.importEntities(data.entities || {}, snapshotDoc._id);
            await this.importServices(data.services || {});
            await this.snapshotModel.updateOne({ _id: snapshotDoc._id }, { $set: { status: ha_snapshot_schema_1.SnapshotStatus.COMPLETED } }).exec();
            this.logger.log(`Import completed successfully for snapshot ${snapshotDoc._id}`);
            return await this.snapshotModel.findById(snapshotDoc._id).lean().exec();
        }
        catch (error) {
            this.logger.error(`Import failed: ${error.message}`, error.stack);
            if (snapshotDoc?._id) {
                await this.snapshotModel.updateOne({ _id: snapshotDoc._id }, { $set: { status: ha_snapshot_schema_1.SnapshotStatus.FAILED, errorLog: error.message } }).exec();
            }
            throw error;
        }
    }
    async createSnapshot(data) {
        const snap = new this.snapshotModel({
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
            haVersion: data.home_assistant_version,
            status: ha_snapshot_schema_1.SnapshotStatus.PROCESSING,
        });
        return await snap.save();
    }
    async importAreas(areas) {
        for (const area of areas) {
            const areaId = area.area_id || area.id;
            if (!areaId)
                continue;
            await this.areaModel.updateOne({ areaId }, {
                $set: {
                    name: area.name,
                    aliases: area.aliases,
                    floor: area.floor,
                    icon: area.icon,
                },
            }, { upsert: true }).exec();
        }
    }
    async importDevices(devices) {
        for (const device of devices) {
            const deviceId = device.id || device.device_id;
            if (!deviceId)
                continue;
            await this.deviceModel.updateOne({ deviceId }, {
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
            }, { upsert: true }).exec();
        }
    }
    async importEntities(entities, snapshotId) {
        for (const [entityType, entityList] of Object.entries(entities)) {
            if (!Array.isArray(entityList))
                continue;
            for (const entityData of entityList) {
                const entityId = entityData.entity_id;
                if (!entityId)
                    continue;
                const [domain, objectId] = entityId.split('.');
                await this.entityModel.updateOne({ entityId }, {
                    $set: {
                        entityType: entityType,
                        domain,
                        objectId,
                        friendlyName: entityData.friendly_name || entityData.attributes?.friendly_name,
                        deviceId: entityData.device_id,
                        areaId: entityData.area_id,
                    },
                }, { upsert: true }).exec();
                const stateDoc = await this.stateModel.create({
                    entityId: entityId,
                    snapshotId,
                    state: entityData.state,
                    stateClass: entityData.attributes?.state_class,
                    lastChanged: entityData.last_changed ? new Date(entityData.last_changed) : undefined,
                    lastUpdated: entityData.last_updated ? new Date(entityData.last_updated) : undefined,
                });
                if (entityData.attributes) {
                    await this.importAttributes(entityData.attributes, stateDoc._id);
                }
                await this.importSpecializedEntity(entityId, entityData, entityType);
            }
        }
    }
    async importAttributes(attributes, entityStateId) {
        const ops = [];
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
    getAttributeType(value) {
        if (typeof value === 'string')
            return ha_entity_attribute_schema_1.AttributeType.STRING;
        if (typeof value === 'number')
            return ha_entity_attribute_schema_1.AttributeType.NUMBER;
        if (typeof value === 'boolean')
            return ha_entity_attribute_schema_1.AttributeType.BOOLEAN;
        if (Array.isArray(value))
            return ha_entity_attribute_schema_1.AttributeType.ARRAY;
        return ha_entity_attribute_schema_1.AttributeType.OBJECT;
    }
    async importSpecializedEntity(entityId, data, entityType) {
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
    async importPerson(entityId, data) {
        await this.personModel.updateOne({ entityId }, {
            $set: {
                personId: data.attributes?.id || entityId.split('.')[1],
                name: data.friendly_name || data.attributes?.friendly_name,
                userId: data.attributes?.user_id,
                deviceTrackers: data.attributes?.device_trackers,
                latitude: data.attributes?.latitude,
                longitude: data.attributes?.longitude,
                gpsAccuracy: data.attributes?.gps_accuracy,
            },
        }, { upsert: true }).exec();
    }
    async importZone(entityId, data) {
        await this.zoneModel.updateOne({ entityId }, {
            $set: {
                zoneName: data.friendly_name || entityId.split('.')[1],
                latitude: data.attributes?.latitude,
                longitude: data.attributes?.longitude,
                radius: data.attributes?.radius,
                passive: data.attributes?.passive || false,
                persons: data.attributes?.persons,
                icon: data.attributes?.icon,
            },
        }, { upsert: true }).exec();
    }
    async importAutomation(entityId, data) {
        await this.automationModel.updateOne({ entityId }, {
            $set: {
                automationId: data.attributes?.id || entityId.split('.')[1],
                alias: data.attributes?.alias || data.friendly_name,
                description: data.attributes?.description,
                mode: (data.attributes?.mode || 'single'),
                current: data.attributes?.current || 0,
                max: data.attributes?.max,
            },
        }, { upsert: true }).exec();
    }
    async importMediaPlayer(entityId, data) {
        await this.mediaPlayerModel.updateOne({ entityId }, {
            $set: {
                volumeLevel: data.attributes?.volume_level,
                isVolumeMuted: data.attributes?.is_volume_muted || false,
                mediaContentType: data.attributes?.media_content_type,
                mediaTitle: data.attributes?.media_title,
                mediaArtist: data.attributes?.media_artist,
                groupMembers: data.attributes?.group_members,
            },
        }, { upsert: true }).exec();
    }
    async importServices(services) {
        for (const [domain, domainServices] of Object.entries(services)) {
            if (typeof domainServices !== 'object')
                continue;
            for (const [serviceName, serviceData] of Object.entries(domainServices)) {
                const fullName = `${domain}.${serviceName}`;
                await this.serviceModel.updateOne({ fullName }, {
                    $set: {
                        domain,
                        serviceName,
                        description: serviceData.description,
                        fields: serviceData.fields,
                        target: serviceData.target,
                        responseOptional: serviceData.response?.optional !== false,
                    },
                }, { upsert: true }).exec();
            }
        }
    }
};
exports.HaImportService = HaImportService;
exports.HaImportService = HaImportService = HaImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ha_snapshot_schema_1.HaSnapshot.name)),
    __param(1, (0, mongoose_1.InjectModel)(ha_area_schema_1.HaArea.name)),
    __param(2, (0, mongoose_1.InjectModel)(ha_device_schema_1.HaDevice.name)),
    __param(3, (0, mongoose_1.InjectModel)(ha_entity_schema_1.HaEntity.name)),
    __param(4, (0, mongoose_1.InjectModel)(ha_entity_state_schema_1.HaEntityState.name)),
    __param(5, (0, mongoose_1.InjectModel)(ha_entity_attribute_schema_1.HaEntityAttribute.name)),
    __param(6, (0, mongoose_1.InjectModel)(ha_person_schema_1.HaPerson.name)),
    __param(7, (0, mongoose_1.InjectModel)(ha_zone_schema_1.HaZone.name)),
    __param(8, (0, mongoose_1.InjectModel)(ha_automation_schema_1.HaAutomation.name)),
    __param(9, (0, mongoose_1.InjectModel)(ha_media_player_schema_1.HaMediaPlayer.name)),
    __param(10, (0, mongoose_1.InjectModel)(ha_service_schema_1.HaService.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], HaImportService);
//# sourceMappingURL=ha-import.service.js.map