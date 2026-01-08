import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { UserDeviceBindingService } from '../services/user-device-binding.service';
import { DeviceEntityBindingService } from '../services/device-entity-binding.service';
import { DeviceAreaBindingService } from '../services/device-area-binding.service';
import {
  CreateUserDeviceBindingDto,
  UpdateUserDeviceBindingDto,
} from '../dto/user-device-binding.dto';
import {
  CreateDeviceEntityBindingDto,
  UpdateDeviceEntityBindingDto,
} from '../dto/device-entity-binding.dto';
import {
  CreateDeviceAreaBindingDto,
  UpdateDeviceAreaBindingDto,
} from '../dto/device-area-binding.dto';

/**
 * Controller für Binding-Management (User-Device, Device-Entity, Device-Area)
 *
 * Endpoints:
 * - User-Device Bindings: /api/bindings/user-device
 * - Device-Entity Bindings: /api/bindings/device-entity
 * - Device-Area Bindings: /api/bindings/device-area
 *
 * TODO: Add JwtAuthGuard when auth is implemented
 */
@Controller('api/bindings')
export class BindingsController {
  constructor(
    private readonly userDeviceService: UserDeviceBindingService,
    private readonly deviceEntityService: DeviceEntityBindingService,
    private readonly deviceAreaService: DeviceAreaBindingService,
  ) {}

  // ==========================================
  // User-Device Bindings
  // ==========================================

  /**
   * POST /api/bindings/user-device
   * Erstellt eine neue User-Device-Bindung
   */
  @Post('user-device')
  createUserDeviceBinding(@Body() dto: CreateUserDeviceBindingDto) {
    return this.userDeviceService.create(dto);
  }

  /**
   * GET /api/bindings/user-device/user/:userId
   * Findet alle Bindings eines Users
   */
  @Get('user-device/user/:userId')
  getUserDeviceBindingsByUser(@Param('userId') userId: string) {
    return this.userDeviceService.findByUser(userId);
  }

  /**
   * GET /api/bindings/user-device/device/:deviceId
   * Findet alle Bindings eines Devices
   */
  @Get('user-device/device/:deviceId')
  getUserDeviceBindingsByDevice(@Param('deviceId') deviceId: string) {
    return this.userDeviceService.findByDevice(deviceId);
  }

  /**
   * GET /api/bindings/user-device/user/:userId/primary
   * Findet das primäre Device eines Users
   */
  @Get('user-device/user/:userId/primary')
  getPrimaryUserDevice(@Param('userId') userId: string) {
    return this.userDeviceService.findPrimaryDevice(userId);
  }

  /**
   * GET /api/bindings/user-device/user/:userId/suggestions
   * Schlägt Bindings für einen User vor (basierend auf HA-Daten)
   */
  @Get('user-device/user/:userId/suggestions')
  suggestUserDeviceBindings(@Param('userId') userId: string) {
    return this.userDeviceService.suggestBindingsForUser(userId);
  }

  /**
   * PUT /api/bindings/user-device/:id
   * Aktualisiert eine User-Device-Bindung
   */
  @Put('user-device/:id')
  updateUserDeviceBinding(
    @Param('id') id: string,
    @Body() dto: UpdateUserDeviceBindingDto,
  ) {
    return this.userDeviceService.update(id, dto);
  }

  /**
   * DELETE /api/bindings/user-device/:id
   * Löscht eine User-Device-Bindung
   */
  @Delete('user-device/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUserDeviceBinding(@Param('id') id: string) {
    return this.userDeviceService.remove(id);
  }

  // ==========================================
  // Device-Entity Bindings
  // ==========================================

  /**
   * POST /api/bindings/device-entity
   * Erstellt eine neue Device-Entity-Bindung
   */
  @Post('device-entity')
  createDeviceEntityBinding(@Body() dto: CreateDeviceEntityBindingDto) {
    return this.deviceEntityService.create(dto);
  }

  /**
   * GET /api/bindings/device-entity/device/:deviceId
   * Findet alle Entity-Bindings eines Devices
   */
  @Get('device-entity/device/:deviceId')
  async getDeviceEntityBindingsByDevice(@Param('deviceId') deviceId: string) {
    try {
      return await this.deviceEntityService.findByDevice(deviceId);
    } catch (err: any) {
      console.error('Error in getDeviceEntityBindingsByDevice:', err);
      throw new HttpException({ message: err?.message || 'Server error', stack: err?.stack }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/bindings/device-entity/entity/:entityId
   * Findet alle Device-Bindings eines Entities
   */
  @Get('device-entity/entity/:entityId')
  async getDeviceEntityBindingsByEntity(@Param('entityId') entityId: string) {
    try {
      return await this.deviceEntityService.findByEntity(entityId);
    } catch (err: any) {
      console.error('Error in getDeviceEntityBindingsByEntity:', err);
      throw new HttpException({ message: err?.message || 'Server error', stack: err?.stack }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/bindings/device-entity/device/:deviceId/category/:category
   * Findet Bindings nach Kategorie
   */
  @Get('device-entity/device/:deviceId/category/:category')
  getDeviceEntityBindingsByCategory(
    @Param('deviceId') deviceId: string,
    @Param('category') category: string,
  ) {
    return this.deviceEntityService.findByCategory(deviceId, category);
  }

  /**
   * GET /api/bindings/device-entity/device/:deviceId/suggestions
   * Schlägt Entity-Bindings für ein Device vor
   */
  @Get('device-entity/device/:deviceId/suggestions')
  suggestDeviceEntityBindings(@Param('deviceId') deviceId: string) {
    return this.deviceEntityService.suggestEntitiesForDevice(deviceId);
  }

  /**
   * POST /api/bindings/device-entity/sync-auto
   * Synchronisiert automatische Bindings aus HA
   */
  @Post('device-entity/sync-auto')
  syncAutoDeviceEntityBindings() {
    return this.deviceEntityService.syncAutoBindings();
  }

  /**
   * POST /api/bindings/device-entity/device/:deviceId/apply-preset
   * Wendet ein Filter-Preset an (all_sensors, battery_only, controls_only, location_only)
   */
  @Post('device-entity/device/:deviceId/apply-preset')
  applyDeviceEntityPreset(
    @Param('deviceId') deviceId: string,
    @Body('preset') preset: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only',
  ) {
    return this.deviceEntityService.applyFilterPreset(deviceId, preset);
  }

  /**
   * PUT /api/bindings/device-entity/:id
   * Aktualisiert eine Device-Entity-Bindung
   */
  @Put('device-entity/:id')
  updateDeviceEntityBinding(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceEntityBindingDto,
  ) {
    return this.deviceEntityService.update(id, dto);
  }

  /**
   * DELETE /api/bindings/device-entity/:id
   * Löscht eine Device-Entity-Bindung
   */
  @Delete('device-entity/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDeviceEntityBinding(@Param('id') id: string) {
    return this.deviceEntityService.remove(id);
  }

  /**
   * POST /api/bindings/device/:deviceId/reset
   * Setzt Device-Bindings zurück
   */
  @Post('device/:deviceId/reset')
  resetDeviceBindings(
    @Param('deviceId') deviceId: string,
    @Body() options?: { reSync?: boolean; keepAuto?: boolean },
  ) {
    return this.deviceEntityService.resetDeviceBindings(deviceId, options);
  }

  // ==========================================
  // Device-Area Bindings
  // ==========================================

  /**
   * POST /api/bindings/device-area
   * Erstellt eine neue Device-Area-Bindung
   */
  @Post('device-area')
  createDeviceAreaBinding(@Body() dto: CreateDeviceAreaBindingDto) {
    return this.deviceAreaService.create(dto);
  }

  /**
   * GET /api/bindings/device-area/device/:deviceId
   * Findet alle Area-Bindings eines Devices
   */
  @Get('device-area/device/:deviceId')
  getDeviceAreaBindingsByDevice(@Param('deviceId') deviceId: string) {
    return this.deviceAreaService.findByDevice(deviceId);
  }

  /**
   * GET /api/bindings/device-area/area/:areaId
   * Findet alle Device-Bindings einer Area
   */
  @Get('device-area/area/:areaId')
  getDeviceAreaBindingsByArea(@Param('areaId') areaId: string) {
    return this.deviceAreaService.findByArea(areaId);
  }

  /**
   * GET /api/bindings/device-area/device/:deviceId/primary
   * Findet die primäre Area eines Devices
   */
  @Get('device-area/device/:deviceId/primary')
  getPrimaryDeviceArea(@Param('deviceId') deviceId: string) {
    return this.deviceAreaService.findPrimaryArea(deviceId);
  }

  /**
   * GET /api/bindings/device-area/device/:deviceId/active
   * Findet aktive (nicht abgelaufene) Bindings eines Devices
   */
  @Get('device-area/device/:deviceId/active')
  getActiveDeviceAreaBindings(@Param('deviceId') deviceId: string) {
    return this.deviceAreaService.findActiveBindings(deviceId);
  }

  /**
   * POST /api/bindings/device-area/cleanup-expired
   * Entfernt abgelaufene temporäre Bindings
   */
  @Post('device-area/cleanup-expired')
  cleanupExpiredDeviceAreaBindings() {
    return this.deviceAreaService.cleanupExpiredBindings();
  }

  /**
   * PUT /api/bindings/device-area/:id
   * Aktualisiert eine Device-Area-Bindung
   */
  @Put('device-area/:id')
  updateDeviceAreaBinding(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceAreaBindingDto,
  ) {
    return this.deviceAreaService.update(id, dto);
  }

  /**
   * DELETE /api/bindings/device-area/:id
   * Löscht eine Device-Area-Bindung
   */
  @Delete('device-area/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDeviceAreaBinding(@Param('id') id: string) {
    return this.deviceAreaService.remove(id);
  }
}

