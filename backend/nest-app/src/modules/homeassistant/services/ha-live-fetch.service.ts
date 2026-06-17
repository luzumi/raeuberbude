import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HaLiveFetchService {
  private readonly logger = new Logger(HaLiveFetchService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(this.config.get<string>('HA_BASE_URL') && this.config.get<string>('HA_TOKEN'));
  }

  async fetchLiveData(): Promise<any> {
    const base = (this.config.get<string>('HA_BASE_URL') || '').replace(/\/$/, '');
    const token = this.config.get<string>('HA_TOKEN') || '';

    if (!base || !token) {
      throw new Error('HA_BASE_URL und HA_TOKEN sind nicht konfiguriert');
    }

    const client = axios.create({
      baseURL: base,
      timeout: 20000,
      headers: { Authorization: `Bearer ${token}` },
    });

    const get = async (url: string) => {
      try {
        const { data } = await client.get(url);
        return data;
      } catch {
        return null;
      }
    };

    this.logger.log('Fetching live HA data...');

    const [states, services, configData] = await Promise.all([
      get('/api/states'),
      get('/api/services'),
      get('/api/config'),
    ]);

    // Entities nach Domain gruppieren (wie ha_dump.js)
    const entitiesByDomain: Record<string, any[]> = {};
    if (Array.isArray(states)) {
      for (const s of states) {
        const entityId: string = s.entity_id || '';
        if (!entityId) continue;
        const domain = entityId.split('.')[0];
        if (!entitiesByDomain[domain]) entitiesByDomain[domain] = [];
        const attributes = s.attributes || {};
        entitiesByDomain[domain].push({
          entity_id: entityId,
          state: s.state,
          attributes,
          friendly_name: attributes.friendly_name || null,
          area_id: s.context?.area_id || null,
          device_id: s.context?.device_id || null,
        });
      }
    }

    // Services normalisieren
    const servicesMap: Record<string, any> = {};
    if (Array.isArray(services)) {
      for (const svc of services) {
        if (svc?.domain && svc?.services) servicesMap[svc.domain] = svc.services;
      }
    } else if (services && typeof services === 'object') {
      Object.assign(servicesMap, services);
    }

    // Areas + Devices (best-effort)
    let areas: any[] = [];
    let devices: any[] = [];
    for (const url of ['/api/area_registry/list', '/api/areas']) {
      const a = await get(url);
      if (Array.isArray(a)) { areas = a; break; }
    }
    for (const url of ['/api/device_registry/list', '/api/devices']) {
      const d = await get(url);
      if (Array.isArray(d)) { devices = d; break; }
    }

    const entityCount = Object.values(entitiesByDomain).reduce((s, arr) => s + arr.length, 0);
    this.logger.log(`Live fetch complete: ${entityCount} entities, ${areas.length} areas, ${devices.length} devices`);

    return {
      timestamp: new Date().toISOString(),
      home_assistant_version: configData?.version || null,
      entities: entitiesByDomain,
      services: servicesMap,
      areas,
      devices,
    };
  }
}
