import { Controller, Post, Get, Logger } from '@nestjs/common';
import { HaLiveSyncService } from '../services/ha-live-sync.service';

/**
 * Controller für Live-Synchronisation mit Home Assistant
 */
@Controller('api/ha/sync')
export class HaLiveSyncController {
  private readonly logger = new Logger(HaLiveSyncController.name);

  constructor(private readonly syncService: HaLiveSyncService) {}

  /**
   * POST /api/ha/sync/all
   * Synchronisiert alle Daten (Areas, Devices, Entities) von Home Assistant
   */
  @Post('all')
  async syncAll() {
    this.logger.log('Starte vollständige Synchronisation...');
    try {
      const result = await this.syncService.syncAll();
      return {
        success: true,
        message: 'Synchronisation erfolgreich',
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Synchronisation fehlgeschlagen: ${error.message}`);
      return {
        success: false,
        message: 'Synchronisation fehlgeschlagen',
        error: error.message,
      };
    }
  }

  /**
   * POST /api/ha/sync/areas
   * Synchronisiert nur Areas
   */
  @Post('areas')
  async syncAreas() {
    try {
      const count = await this.syncService.syncAreas();
      return {
        success: true,
        message: `${count} Areas synchronisiert`,
        count,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * POST /api/ha/sync/devices
   * Synchronisiert nur Devices
   */
  @Post('devices')
  async syncDevices() {
    try {
      const count = await this.syncService.syncDevices();
      return {
        success: true,
        message: `${count} Devices synchronisiert`,
        count,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * POST /api/ha/sync/entities
   * Synchronisiert nur Entities
   */
  @Post('entities')
  async syncEntities() {
    try {
      const count = await this.syncService.syncEntities();
      return {
        success: true,
        message: `${count} Entities synchronisiert`,
        count,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * POST /api/ha/sync/automations
   */
  @Post('automations')
  async syncAutomations() {
    try {
      const count = await this.syncService.syncAutomations();
      return { success: true, message: `${count} Automations gefunden`, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /api/ha/sync/persons
   */
  @Post('persons')
  async syncPersons() {
    try {
      const count = await this.syncService.syncPersons();
      return { success: true, message: `${count} Persons synchronisiert`, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /api/ha/sync/zones
   */
  @Post('zones')
  async syncZones() {
    try {
      const count = await this.syncService.syncZones();
      return { success: true, message: `${count} Zones synchronisiert`, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /api/ha/sync/media_players
   */
  @Post('media_players')
  async syncMediaPlayers() {
    try {
      const count = await this.syncService.syncMediaPlayers();
      return { success: true, message: `${count} Media Players synchronisiert`, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /api/ha/sync/services
   */
  @Post('services')
  async syncServices() {
    try {
      const count = await this.syncService.syncServices();
      return { success: true, message: `${count} Services gefunden`, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET /api/ha/sync/test
   * Testet die Verbindung zu Home Assistant
   */
  @Get('test')
  async testConnection() {
    const result = await this.syncService.testConnection();
    return result;
  }

  /**
   * GET /api/ha/sync/domains
   * Gibt alle verfügbaren Entity-Domains zurück
   */
  @Get('domains')
  async getDomains() {
    const domains = await this.syncService.getEntityDomains();
    return {
      success: true,
      domains,
      count: domains.length,
    };
  }
}
