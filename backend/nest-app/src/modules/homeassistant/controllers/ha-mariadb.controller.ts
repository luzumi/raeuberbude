import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HaMariaDbQueryService } from '../services/ha-mariadb-query.service';

/**
 * Controller for Home Assistant data from MariaDB
 *
 * Provides REST endpoints to query HA entities, devices, and areas
 * from the MariaDB database.
 */
@ApiTags('HomeAssistant (MariaDB)')
@Controller('api/homeassistant/db')
export class HaMariaDbController {
  constructor(private readonly queryService: HaMariaDbQueryService) {}

  // --- Entities ---

  @Get('entities')
  @ApiOperation({ summary: 'Get all entities from MariaDB' })
  @ApiQuery({ name: 'domain', required: false, description: 'Filter by domain (e.g., light, sensor)' })
  @ApiResponse({ status: 200, description: 'List of entities' })
  async getAllEntities(@Query('domain') domain?: string) {
    return this.queryService.getAllEntities(domain);
  }

  @Get('entities/search')
  @ApiOperation({ summary: 'Search entities in MariaDB' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchEntities(@Query('q') searchTerm: string) {
    return this.queryService.searchEntities(searchTerm);
  }

  @Get('entities/:entityId')
  @ApiOperation({ summary: 'Get entity by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Entity details' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getEntity(@Param('entityId') entityId: string) {
    return this.queryService.getEntityById(entityId);
  }

  // --- Devices ---

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async getAllDevices() {
    return this.queryService.getAllDevices();
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDevice(@Param('deviceId') deviceId: string) {
    return this.queryService.getDeviceWithEntities(deviceId);
  }

  // --- Areas ---

  @Get('areas')
  @ApiOperation({ summary: 'Get all areas from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of areas' })
  async getAllAreas() {
    return this.queryService.getAllAreas();
  }

  @Get('areas/:areaId')
  @ApiOperation({ summary: 'Get area by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Area details with devices and entities' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async getArea(@Param('areaId') areaId: string) {
    return this.queryService.getAreaWithDevicesAndEntities(areaId);
  }

  @Get('areas/:areaId/entities')
  @ApiOperation({ summary: 'Get entities in area from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of entities' })
  async getEntitiesByArea(@Param('areaId') areaId: string) {
    return this.queryService.getEntitiesByArea(areaId);
  }

  @Get('areas/:areaId/devices')
  @ApiOperation({ summary: 'Get devices in area from MariaDB (via area_id in devices)' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async getDevicesByArea(@Param('areaId') areaId: string) {
    const area = await this.queryService.getAreaWithDevicesAndEntities(areaId);
    return area?.devices || [];
  }

  // --- Persons ---

  @Get('persons')
  @ApiOperation({ summary: 'Get all persons from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of persons' })
  async getAllPersons() {
    return this.queryService.getAllPersons();
  }

  @Get('persons/:personId')
  @ApiOperation({ summary: 'Get person by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Person details' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getPerson(@Param('personId') personId: string) {
    return this.queryService.getPersonById(personId);
  }

  @Get('persons/:personId/location')
  @ApiOperation({ summary: 'Get person location from MariaDB' })
  @ApiResponse({ status: 200, description: 'Person location' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getPersonLocation(@Param('personId') personId: string) {
    return this.queryService.getPersonLocation(personId);
  }

  // --- Zones ---

  @Get('zones')
  @ApiOperation({ summary: 'Get all zones from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  async getAllZones() {
    return this.queryService.getAllZones();
  }

  @Get('zones/:zoneId')
  @ApiOperation({ summary: 'Get zone by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Zone details' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async getZone(@Param('zoneId') zoneId: string) {
    return this.queryService.getZoneById(zoneId);
  }

  @Get('zones/:zoneName/persons')
  @ApiOperation({ summary: 'Get persons in zone from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of persons' })
  async getPersonsInZone(@Param('zoneName') zoneName: string) {
    return this.queryService.getPersonsInZone(zoneName);
  }

  // --- Automations ---

  @Get('automations')
  @ApiOperation({ summary: 'Get all automations from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of automations' })
  async getAllAutomations() {
    return this.queryService.getAllAutomations();
  }

  @Get('automations/active')
  @ApiOperation({ summary: 'Get active automations from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of active automations' })
  async getActiveAutomations() {
    return this.queryService.getActiveAutomations();
  }

  @Get('automations/:automationId')
  @ApiOperation({ summary: 'Get automation by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Automation details' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async getAutomation(@Param('automationId') automationId: string) {
    return this.queryService.getAutomationById(automationId);
  }

  // --- Media Players ---

  @Get('media-players')
  @ApiOperation({ summary: 'Get all media players from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of media players' })
  async getAllMediaPlayers() {
    return this.queryService.getAllMediaPlayers();
  }

  @Get('media-players/active')
  @ApiOperation({ summary: 'Get active media players from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of active media players' })
  async getActiveMediaPlayers() {
    return this.queryService.getActiveMediaPlayers();
  }

  @Get('media-players/:entityId')
  @ApiOperation({ summary: 'Get media player by ID from MariaDB' })
  @ApiResponse({ status: 200, description: 'Media player details' })
  @ApiResponse({ status: 404, description: 'Media player not found' })
  async getMediaPlayer(@Param('entityId') entityId: string) {
    return this.queryService.getMediaPlayerById(entityId);
  }

  // --- Domains (alle 27 unterstützt) ---

  @Get('domains')
  @ApiOperation({
    summary: 'Get all available domains with entity counts',
    description: 'Returns all 27 supported Home Assistant domains: automation, binary_sensor, button, calendar, conversation, device_tracker, event, image, input_boolean, input_number, input_select, light, media_player, number, person, remote, script, select, sensor, stt, sun, switch, todo, tts, update, weather, zone'
  })
  @ApiResponse({ status: 200, description: 'List of domains with counts' })
  async getAllDomains() {
    const domains = await this.queryService.getAllDomains();
    return {
      success: true,
      domains: domains.map(d => d.domain),
      domainCounts: domains,
      count: domains.length
    };
  }

  @Get('domains/:domain/entities')
  @ApiOperation({
    summary: 'Get all entities for a specific domain',
    description: 'Supports all 27 domains'
  })
  @ApiResponse({ status: 200, description: 'List of entities in domain' })
  async getEntitiesByDomain(@Param('domain') domain: string) {
    return this.queryService.getEntitiesByDomain(domain);
  }

  // --- Lights ---

  @Get('lights')
  @ApiOperation({ summary: 'Get all lights from MariaDB (domain=light)' })
  @ApiResponse({ status: 200, description: 'List of lights' })
  async getAllLights() {
    return this.queryService.getAllLights();
  }

  // --- Switches ---

  @Get('switches')
  @ApiOperation({ summary: 'Get all switches from MariaDB (domain=switch)' })
  @ApiResponse({ status: 200, description: 'List of switches' })
  async getAllSwitches() {
    return this.queryService.getAllSwitches();
  }

  // --- Sensors ---

  @Get('sensors')
  @ApiOperation({ summary: 'Get all sensors from MariaDB (domain=sensor)' })
  @ApiResponse({ status: 200, description: 'List of sensors' })
  async getAllSensors() {
    return this.queryService.getAllSensors();
  }

  @Get('binary-sensors')
  @ApiOperation({ summary: 'Get all binary sensors from MariaDB (domain=binary_sensor)' })
  @ApiResponse({ status: 200, description: 'List of binary sensors' })
  async getAllBinarySensors() {
    return this.queryService.getAllBinarySensors();
  }

  // --- Services ---

  @Get('services')
  @ApiOperation({ summary: 'Get all services from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getAllServices() {
    return this.queryService.getAllServices();
  }

  @Get('services/:domain')
  @ApiOperation({ summary: 'Get services by domain from MariaDB' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getServicesByDomain(@Param('domain') domain: string) {
    return this.queryService.getServicesByDomain(domain);
  }

  @Get('services/:domain/:service')
  @ApiOperation({ summary: 'Get service details from MariaDB' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(@Param('domain') domain: string, @Param('service') service: string) {
    return this.queryService.getService(domain, service);
  }

  // --- Entity States ---

  @Get('entities/:entityId/state')
  @ApiOperation({ summary: 'Get current state of entity from MariaDB' })
  @ApiResponse({ status: 200, description: 'Entity state' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getEntityState(@Param('entityId') entityId: string) {
    return this.queryService.getEntityCurrentState(entityId);
  }

  @Get('entities/:entityId/history')
  @ApiOperation({ summary: 'Get entity state history from MariaDB' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Entity state history' })
  async getEntityHistory(
    @Param('entityId') entityId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.queryService.getEntityStateHistory(entityId, start, end);
  }

  // --- Statistics ---

  @Get('statistics')
  @ApiOperation({ summary: 'Get statistics from MariaDB' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStatistics() {
    return this.queryService.getStatistics();
  }
}

