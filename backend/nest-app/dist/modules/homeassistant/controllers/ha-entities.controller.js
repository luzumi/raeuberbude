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
exports.HaEntitiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ha_query_service_1 = require("../services/ha-query.service");
let HaEntitiesController = class HaEntitiesController {
    constructor(queryService) {
        this.queryService = queryService;
    }
    async getAllEntities(type) {
        return await this.queryService.getAllEntities(type);
    }
    async searchEntities(searchTerm) {
        return await this.queryService.searchEntities(searchTerm);
    }
    async getStatistics() {
        return await this.queryService.getStatistics();
    }
    async getAllDevices() {
        return await this.queryService.getAllDevices();
    }
    async getDevice(deviceId) {
        return await this.queryService.getDeviceById(deviceId);
    }
    async getAllAreas() {
        return await this.queryService.getAllAreas();
    }
    async getArea(areaId) {
        return await this.queryService.getAreaById(areaId);
    }
    async getDevicesByArea(areaId) {
        return await this.queryService.getDevicesByArea(areaId);
    }
    async getAllPersons() {
        return await this.queryService.getAllPersons();
    }
    async getPerson(personId) {
        return await this.queryService.getPersonById(personId);
    }
    async getPersonLocation(personId) {
        return await this.queryService.getPersonLocation(personId);
    }
    async getAllZones() {
        return await this.queryService.getAllZones();
    }
    async getPersonsInZone(zoneName) {
        return await this.queryService.getPersonsInZone(zoneName);
    }
    async getAllAutomations(active) {
        if (active === 'true') {
            return await this.queryService.getActiveAutomations();
        }
        return await this.queryService.getAllAutomations();
    }
    async getAutomation(automationId) {
        return await this.queryService.getAutomationById(automationId);
    }
    async getAllMediaPlayers(active) {
        if (active === 'true') {
            return await this.queryService.getActiveMediaPlayers();
        }
        return await this.queryService.getAllMediaPlayers();
    }
    async getAllServices(domain) {
        if (domain) {
            return await this.queryService.getServicesByDomain(domain);
        }
        return await this.queryService.getAllServices();
    }
    async getService(domain, service) {
        return await this.queryService.getService(domain, service);
    }
    async getEntity(entityId) {
        return await this.queryService.getEntityById(entityId);
    }
    async getEntityState(entityId) {
        return await this.queryService.getEntityCurrentState(entityId);
    }
    async getEntityHistory(entityId, startDate, endDate) {
        return await this.queryService.getEntityStateHistory(entityId, startDate, endDate);
    }
};
exports.HaEntitiesController = HaEntitiesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all entities' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, description: 'Filter by entity type' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of entities' }),
    __param(0, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllEntities", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search entities' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'Search term' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search results' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "searchEntities", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all devices' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of devices' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllDevices", null);
__decorate([
    (0, common_1.Get)('devices/:deviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get device by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Device details' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getDevice", null);
__decorate([
    (0, common_1.Get)('areas'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all areas' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of areas' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllAreas", null);
__decorate([
    (0, common_1.Get)('areas/:areaId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get area by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Area details' }),
    __param(0, (0, common_1.Param)('areaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getArea", null);
__decorate([
    (0, common_1.Get)('areas/:areaId/devices'),
    (0, swagger_1.ApiOperation)({ summary: 'Get devices in area' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of devices in area' }),
    __param(0, (0, common_1.Param)('areaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getDevicesByArea", null);
__decorate([
    (0, common_1.Get)('persons'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all persons' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of persons' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllPersons", null);
__decorate([
    (0, common_1.Get)('persons/:personId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get person by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Person details' }),
    __param(0, (0, common_1.Param)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getPerson", null);
__decorate([
    (0, common_1.Get)('persons/:personId/location'),
    (0, swagger_1.ApiOperation)({ summary: 'Get person location' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Person location' }),
    __param(0, (0, common_1.Param)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getPersonLocation", null);
__decorate([
    (0, common_1.Get)('zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all zones' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of zones' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllZones", null);
__decorate([
    (0, common_1.Get)('zones/:zoneName/persons'),
    (0, swagger_1.ApiOperation)({ summary: 'Get persons in zone' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of persons in zone' }),
    __param(0, (0, common_1.Param)('zoneName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getPersonsInZone", null);
__decorate([
    (0, common_1.Get)('automations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all automations' }),
    (0, swagger_1.ApiQuery)({ name: 'active', required: false, description: 'Filter active automations only' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of automations' }),
    __param(0, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllAutomations", null);
__decorate([
    (0, common_1.Get)('automations/:automationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get automation by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Automation details' }),
    __param(0, (0, common_1.Param)('automationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAutomation", null);
__decorate([
    (0, common_1.Get)('media-players'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all media players' }),
    (0, swagger_1.ApiQuery)({ name: 'active', required: false, description: 'Filter active media players only' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of media players' }),
    __param(0, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllMediaPlayers", null);
__decorate([
    (0, common_1.Get)('services'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all services' }),
    (0, swagger_1.ApiQuery)({ name: 'domain', required: false, description: 'Filter by domain' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of services' }),
    __param(0, (0, common_1.Query)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getAllServices", null);
__decorate([
    (0, common_1.Get)('services/:domain/:service'),
    (0, swagger_1.ApiOperation)({ summary: 'Get specific service' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service details' }),
    __param(0, (0, common_1.Param)('domain')),
    __param(1, (0, common_1.Param)('service')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getService", null);
__decorate([
    (0, common_1.Get)(':entityId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get entity by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Entity details' }),
    __param(0, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getEntity", null);
__decorate([
    (0, common_1.Get)(':entityId/state'),
    (0, swagger_1.ApiOperation)({ summary: 'Get entity current state' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current state' }),
    __param(0, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getEntityState", null);
__decorate([
    (0, common_1.Get)(':entityId/history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get entity state history' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: Date }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: Date }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'State history' }),
    __param(0, (0, common_1.Param)('entityId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Date,
        Date]),
    __metadata("design:returntype", Promise)
], HaEntitiesController.prototype, "getEntityHistory", null);
exports.HaEntitiesController = HaEntitiesController = __decorate([
    (0, swagger_1.ApiTags)('HomeAssistant Entities'),
    (0, common_1.Controller)('api/homeassistant/entities'),
    __metadata("design:paramtypes", [ha_query_service_1.HaQueryService])
], HaEntitiesController);
//# sourceMappingURL=ha-entities.controller.js.map