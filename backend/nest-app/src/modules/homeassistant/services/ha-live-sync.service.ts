import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { HaDevice } from '../entities/ha-device.entity';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { HaArea } from '../entities/ha-area.entity';

interface HADeviceRegistryEntry {
  id: string;
  name?: string;
  name_by_user?: string;
  manufacturer?: string;
  model?: string;
  sw_version?: string;
  configuration_url?: string;
  connections?: any[];
  identifiers?: any[];
  via_device_id?: string;
  area_id?: string;
  disabled_by?: string | null;
}

interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
  name?: string;
  original_name?: string;
  unique_id?: string;
  icon?: string;
  device_class?: string;
  entity_category?: string;
  disabled_by?: string | null;
  hidden_by?: string | null;
}

interface HAAreaRegistryEntry {
  area_id: string;
  name: string;
  aliases?: string[];
  floor?: string;
  icon?: string;
}

interface HAState {
  entity_id: string;
  state: string;
  attributes: any;
  last_changed: string;
  last_updated: string;
}

/**
 * HaLiveSyncService
 *
 * Synchronisiert Devices, Entities und Areas direkt von Home Assistant
 * über die REST API in die MariaDB.
 */
@Injectable()
export class HaLiveSyncService {
  private readonly logger = new Logger(HaLiveSyncService.name);
  private readonly client: AxiosInstance;
  private readonly haUrl: string;
  private readonly haToken: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(HaDevice)
    private readonly deviceRepo: Repository<HaDevice>,
    @InjectRepository(HaEntityEntity)
    private readonly entityRepo: Repository<HaEntityEntity>,
    @InjectRepository(HaArea)
    private readonly areaRepo: Repository<HaArea>,
  ) {
    this.haUrl = this.config.get<string>('HA_URL') || 'http://homeassistant.local:8123';
    this.haToken = this.config.get<string>('HA_TOKEN') || '';

    if (!this.haToken) {
      this.logger.warn(
        'HA_TOKEN nicht gesetzt! Live-Sync wird nicht funktionieren. ' +
        'Erstelle ein Long-Lived Access Token in Home Assistant unter Profil → Sicherheit.'
      );
    }

    this.client = axios.create({
      baseURL: this.haUrl,
      headers: {
        'Authorization': `Bearer ${this.haToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Vollständige Synchronisation: Areas → Devices → Entities
   */
  async syncAll(): Promise<{
    areas: number;
    devices: number;
    entities: number;
  }> {
    this.logger.log('🔄 Starte vollständige Home Assistant Synchronisation...');

    const areas = await this.syncAreas();
    const devices = await this.syncDevices();
    const entities = await this.syncEntities();

    this.logger.log(
      `✅ Synchronisation abgeschlossen: ${areas} Areas, ${devices} Devices, ${entities} Entities`
    );

    return { areas, devices, entities };
  }

  /**
   * Synchronisiert Areas von Home Assistant
   */
  async syncAreas(): Promise<number> {
    try {
      this.logger.log('📍 Synchronisiere Areas...');
      const response = await this.client.get<HAAreaRegistryEntry[]>(
        '/api/config/area_registry/list'
      );

      const areas = response.data;
      let synced = 0;

      for (const area of areas) {
        try {
          await this.areaRepo.upsert(
            {
              areaId: area.area_id,
              name: area.name,
              aliases: area.aliases || null,
              floor: area.floor || null,
              icon: area.icon || null,
            },
            ['areaId']
          );
          synced++;
        } catch (error: any) {
          this.logger.error(
            `Fehler beim Speichern von Area ${area.area_id}: ${error.message}`
          );
        }
      }

      this.logger.log(`✅ ${synced}/${areas.length} Areas synchronisiert`);
      return synced;
    } catch (error: any) {
      this.logger.error(`❌ Fehler beim Abrufen der Areas: ${error.message}`);
      if (error.response?.status === 401) {
        this.logger.error('⚠️  Authentifizierung fehlgeschlagen. Prüfe HA_TOKEN in .env');
      }
      throw error;
    }
  }

  /**
   * Synchronisiert Devices von Home Assistant
   */
  async syncDevices(): Promise<number> {
    try {
      this.logger.log('🔌 Synchronisiere Devices...');
      const response = await this.client.get<HADeviceRegistryEntry[]>(
        '/api/config/device_registry/list'
      );

      const devices = response.data;
      let synced = 0;

      for (const device of devices) {
        try {
          const displayName = device.name_by_user || device.name || 'Unnamed Device';

          await this.deviceRepo.upsert(
            {
              deviceId: device.id,
              name: displayName,
              manufacturer: device.manufacturer || null,
              model: device.model || null,
              swVersion: device.sw_version || null,
              configurationUrl: device.configuration_url || null,
              connections: device.connections || null,
              identifiers: device.identifiers || null,
              viaDeviceId: device.via_device_id || null,
              areaId: device.area_id || null,
            },
            ['deviceId']
          );
          synced++;
        } catch (error: any) {
          this.logger.error(
            `Fehler beim Speichern von Device ${device.id}: ${error.message}`
          );
        }
      }

      this.logger.log(`✅ ${synced}/${devices.length} Devices synchronisiert`);
      return synced;
    } catch (error: any) {
      this.logger.error(`❌ Fehler beim Abrufen der Devices: ${error.message}`);
      throw error;
    }
  }

  /**
   * Synchronisiert Entities von Home Assistant
   * Kombiniert Entity Registry + States für vollständige Daten
   */
  async syncEntities(): Promise<number> {
    try {
      this.logger.log('🏠 Synchronisiere Entities...');

      // 1. Entity Registry abrufen
      const registryResponse = await this.client.get<HAEntityRegistryEntry[]>(
        '/api/config/entity_registry/list'
      );

      // 2. States abrufen für zusätzliche Informationen
      const statesResponse = await this.client.get<HAState[]>('/api/states');
      const statesMap = new Map<string, HAState>();
      statesResponse.data.forEach(state => {
        statesMap.set(state.entity_id, state);
      });

      const entities = registryResponse.data;
      let synced = 0;

      for (const entity of entities) {
        try {
          const state = statesMap.get(entity.entity_id);
          const [domain, objectId] = entity.entity_id.split('.');

          await this.entityRepo.upsert(
            {
              entityId: entity.entity_id,
              friendlyName: state?.attributes?.friendly_name || entity.name || entity.original_name || null,
              deviceClass: entity.device_class || null,
              area: entity.area_id || null,
              domain: domain || null,
              platform: entity.platform || null,
              uniqueId: entity.unique_id || null,
              supportedFeatures: state?.attributes?.supported_features || null,
              entityCategory: entity.entity_category || null,
              capabilities: state?.attributes || null,
              originalName: entity.original_name || null,
              objectId: objectId || null,
              deviceId: entity.device_id || null,
              areaId: entity.area_id || null,
            },
            ['entityId']
          );
          synced++;
        } catch (error: any) {
          this.logger.error(
            `Fehler beim Speichern von Entity ${entity.entity_id}: ${error.message}`
          );
        }
      }

      this.logger.log(`✅ ${synced}/${entities.length} Entities synchronisiert`);
      return synced;
    } catch (error: any) {
      this.logger.error(`❌ Fehler beim Abrufen der Entities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Testet die Verbindung zu Home Assistant
   */
  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const response = await this.client.get('/api/');
      return {
        success: true,
        version: response.data.version,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gibt alle Entity-Domains zurück (z.B. light, switch, sensor)
   */
  async getEntityDomains(): Promise<string[]> {
    try {
      const response = await this.client.get<HAState[]>('/api/states');
      const domains = new Set<string>();
      response.data.forEach(state => {
        const [domain] = state.entity_id.split('.');
        domains.add(domain);
      });
      return Array.from(domains).sort();
    } catch (error: any) {
      this.logger.error(`Fehler beim Abrufen der Domains: ${error.message}`);
      return [];
    }
  }

  /**
   * Ruft den aktuellen State einer Entity ab
   */
  async getEntityState(entityId: string): Promise<HAState | null> {
    try {
      const response = await this.client.get<HAState>(`/api/states/${entityId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Fehler beim Abrufen von ${entityId}: ${error.message}`);
      return null;
    }
  }
}

