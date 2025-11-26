import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HaQueryService } from '../services/ha-query.service';

@ApiTags('HomeAssistant Entities')
@Controller('api/homeassistant/entities')
export class HaEntitiesController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all entities' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by entity type' })
  @ApiResponse({ status: 200, description: 'List of entities' })
  async getAllEntities(@Query('type') type?: string) {
    return await this.queryService.getAllEntities(type);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search entities' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchEntities(@Query('q') searchTerm: string) {
    return await this.queryService.searchEntities(searchTerm);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get statistics' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStatistics() {
    return await this.queryService.getStatistics();
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async getAllDevices() {
    return await this.queryService.getAllDevices();
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({ status: 200, description: 'Device details' })
  async getDevice(@Param('deviceId') deviceId: string) {
    return await this.queryService.getDeviceById(deviceId);
  }

  @Get('areas')
  @ApiOperation({ summary: 'Get all areas' })
  @ApiResponse({ status: 200, description: 'List of areas' })
  async getAllAreas() {
    return await this.queryService.getAllAreas();
  }

  @Get('areas/:areaId')
  @ApiOperation({ summary: 'Get area by ID' })
  @ApiResponse({ status: 200, description: 'Area details' })
  async getArea(@Param('areaId') areaId: string) {
    return await this.queryService.getAreaById(areaId);
  }

  @Get('areas/:areaId/devices')
  @ApiOperation({ summary: 'Get devices in area' })
  @ApiResponse({ status: 200, description: 'List of devices in area' })
  async getDevicesByArea(@Param('areaId') areaId: string) {
    return await this.queryService.getDevicesByArea(areaId);
  }

  @Get('persons')
  @ApiOperation({ summary: 'Get all persons' })
  @ApiResponse({ status: 200, description: 'List of persons' })
  async getAllPersons() {
    return await this.queryService.getAllPersons();
  }

  @Get('persons/:personId')
  @ApiOperation({ summary: 'Get person by ID' })
  @ApiResponse({ status: 200, description: 'Person details' })
  async getPerson(@Param('personId') personId: string) {
    return await this.queryService.getPersonById(personId);
  }

  @Get('persons/:personId/location')
  @ApiOperation({ summary: 'Get person location' })
  @ApiResponse({ status: 200, description: 'Person location' })
  async getPersonLocation(@Param('personId') personId: string) {
    return await this.queryService.getPersonLocation(personId);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get all zones' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  async getAllZones() {
    return await this.queryService.getAllZones();
  }

  @Get('zones/:zoneName/persons')
  @ApiOperation({ summary: 'Get persons in zone' })
  @ApiResponse({ status: 200, description: 'List of persons in zone' })
  async getPersonsInZone(@Param('zoneName') zoneName: string) {
    return await this.queryService.getPersonsInZone(zoneName);
  }

  @Get('automations')
  @ApiOperation({ summary: 'Get all automations' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter active automations only' })
  @ApiResponse({ status: 200, description: 'List of automations' })
  async getAllAutomations(@Query('active') active?: string) {
    if (active === 'true') {
      return await this.queryService.getActiveAutomations();
    }
    return await this.queryService.getAllAutomations();
  }

  @Get('automations/:automationId')
  @ApiOperation({ summary: 'Get automation by ID' })
  @ApiResponse({ status: 200, description: 'Automation details' })
  async getAutomation(@Param('automationId') automationId: string) {
    return await this.queryService.getAutomationById(automationId);
  }

  @Get('media-players')
  @ApiOperation({ summary: 'Get all media players' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter active media players only' })
  @ApiResponse({ status: 200, description: 'List of media players' })
  async getAllMediaPlayers(@Query('active') active?: string) {
    if (active === 'true') {
      return await this.queryService.getActiveMediaPlayers();
    }
    return await this.queryService.getAllMediaPlayers();
  }

  @Get('services')
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'domain', required: false, description: 'Filter by domain' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getAllServices(@Query('domain') domain?: string) {
    if (domain) {
      return await this.queryService.getServicesByDomain(domain);
    }
    return await this.queryService.getAllServices();
  }

  @Get('services/:domain/:service')
  @ApiOperation({ summary: 'Get specific service' })
  @ApiResponse({ status: 200, description: 'Service details' })
  async getService(
    @Param('domain') domain: string,
    @Param('service') service: string
  ) {
    return await this.queryService.getService(domain, service);
  }

  @Get(':entityId')
  @ApiOperation({ summary: 'Get entity by ID' })
  @ApiResponse({ status: 200, description: 'Entity details' })
  async getEntity(@Param('entityId') entityId: string) {
    return await this.queryService.getEntityById(entityId);
  }

  @Get(':entityId/state')
  @ApiOperation({ summary: 'Get entity current state' })
  @ApiResponse({ status: 200, description: 'Current state' })
  async getEntityState(@Param('entityId') entityId: string) {
    return await this.queryService.getEntityCurrentState(entityId);
  }

  @Get(':entityId/history')
  @ApiOperation({ summary: 'Get entity state history' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'State history' })
  async getEntityHistory(
    @Param('entityId') entityId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date
  ) {
    return await this.queryService.getEntityStateHistory(entityId, startDate, endDate);
  }
}

// Zusätzliche Endpoints für fehlende HA-Modelle
@ApiTags('HomeAssistant Automations')
@Controller('api/homeassistant/entities/automations')
export class HaAutomationsController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all automations' })
  async getAllAutomations() {
    return await this.queryService.getAllAutomations();
  }

  @Get(':automationId')
  @ApiOperation({ summary: 'Get automation by ID' })
  async getAutomation(@Param('automationId') automationId: string) {
    return await this.queryService.getAutomationById(automationId);
  }
}

@ApiTags('HomeAssistant Persons')
@Controller('api/homeassistant/entities/persons')
export class HaPersonsController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all persons' })
  async getAllPersons() {
    return await this.queryService.getAllPersons();
  }

  @Get(':personId')
  @ApiOperation({ summary: 'Get person by ID' })
  async getPerson(@Param('personId') personId: string) {
    return await this.queryService.getPersonById(personId);
  }

  @Get(':personId/location')
  @ApiOperation({ summary: 'Get person location' })
  async getPersonLocation(@Param('personId') personId: string) {
    return await this.queryService.getPersonLocation(personId);
  }
}

@ApiTags('HomeAssistant Zones')
@Controller('api/homeassistant/entities/zones')
export class HaZonesController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all zones' })
  async getAllZones() {
    return await this.queryService.getAllZones();
  }

  @Get(':zoneId')
  @ApiOperation({ summary: 'Get zone by ID' })
  async getZone(@Param('zoneId') zoneId: string) {
    return await this.queryService.getZoneById(zoneId);
  }

  @Get(':zoneName/persons')
  @ApiOperation({ summary: 'Get persons in zone' })
  async getPersonsInZone(@Param('zoneName') zoneName: string) {
    return await this.queryService.getPersonsInZone(zoneName);
  }
}

@ApiTags('HomeAssistant Media Players')
@Controller('api/homeassistant/entities/media-players')
export class HaMediaPlayersController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all media players' })
  async getAllMediaPlayers() {
    return await this.queryService.getAllMediaPlayers();
  }

  @Get(':entityId')
  @ApiOperation({ summary: 'Get media player by ID' })
  async getMediaPlayer(@Param('entityId') entityId: string) {
    return await this.queryService.getMediaPlayerById(entityId);
  }
}

@ApiTags('HomeAssistant Services')
@Controller('api/homeassistant/entities/services')
export class HaServicesController {
  constructor(private readonly queryService: HaQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'domain', required: false })
  async getAllServices(@Query('domain') domain?: string) {
    if (domain) {
      return await this.queryService.getServicesByDomain(domain);
    }
    return await this.queryService.getAllServices();
  }

  @Get(':domain/:service')
  @ApiOperation({ summary: 'Get service by domain and name' })
  async getService(
    @Param('domain') domain: string,
    @Param('service') service: string
  ) {
    return await this.queryService.getService(domain, service);
  }
}

