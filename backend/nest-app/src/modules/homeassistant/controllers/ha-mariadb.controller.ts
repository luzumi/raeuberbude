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

  // --- Statistics ---

  @Get('statistics')
  @ApiOperation({ summary: 'Get statistics from MariaDB' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStatistics() {
    return this.queryService.getStatistics();
  }
}

