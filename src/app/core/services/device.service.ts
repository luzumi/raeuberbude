import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../services/config-service';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';

export type ParamType = 'number' | 'string' | 'boolean' | 'select';

export interface ActionParam {
  name: string;
  key: string;
  type: ParamType;
  options?: string[];
  default?: any;
}

export interface DeviceAction {
  id: string;
  name: string;
  description?: string;
  params?: ActionParam[];
}

export interface Device {
  id: string;
  name: string;
  type?: string;
  actions: DeviceAction[];
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  // Mock-Daten. Später kann diese Klasse ersetzt werden durch echte API-Aufrufe.
  private readonly devices: Device[] = [
    {
      id: 'lamp_wohnzimmer_1',
      name: 'Schlafzimmer Lampe',
      type: 'light',
      actions: [
        { id: 'on', name: 'Einschalten' },
        { id: 'off', name: 'Ausschalten' },
        {
          id: 'brightness',
          name: 'Helligkeit setzen',
          description: 'Setzt die Helligkeit (0-100)',
          params: [{ name: 'Helligkeit', key: 'level', type: 'number', default: 75 }]
        },
        {
          id: 'color',
          name: 'Farbe setzen',
          description: 'Wähle eine Farbe',
          params: [{ name: 'Farbe', key: 'color', type: 'select', options: ['warmweiß', 'kaltweiß', 'rot', 'grün', 'blau'], default: 'warmweiß' }]
        }
      ]
    },
    {
      id: 'thermostat_bedroom',
      name: 'Schlafzimmer Thermostat',
      type: 'climate',
      actions: [
        { id: 'off', name: 'Heizung aus' },
        { id: 'on', name: 'Heizung an' },
        { id: 'set_temp', name: 'Temperatur setzen', params: [{ name: 'Temperatur (°C)', key: 'temp', type: 'number', default: 20 }] }
      ]
    },
    {
      id: 'jalousie_1',
      name: 'Jalousie',
      type: 'cover',
      actions: [
        { id: 'open', name: 'Öffnen' },
        { id: 'close', name: 'Schließen' },
        { id: 'set_position', name: 'Position setzen', params: [{ name: 'Position (%)', key: 'position', type: 'number', default: 100 }] }
      ]
    }
  ];

  private readonly backendBase = resolveBackendBase(environment.backendApiUrl || environment.apiUrl || '');

  constructor(private readonly http: HttpClient, private readonly config: ConfigService) {}

  private getBaseUrl(): string {
    // Devices kommen über das Nest-Backend (3001) / Proxy, nicht direkt über HomeAssistant '/api' am Frontend.
    return this.backendBase;
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token = this.config?.token;
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    return undefined;
  }

  private buildUrl(path: string): string {
    const base = this.getBaseUrl();
    if (!base) return path;

    // normalize
    const normalizedBase = String(base).replace(/\/+$/, '');
    const normalizedPath = String(path || '').startsWith('/') ? String(path || '') : `/${String(path || '')}`;

    // If base already ends with '/api', don't duplicate
    if (normalizedBase.endsWith('/api')) {
      return `${normalizedBase}${normalizedPath}`;
    }

    return `${normalizedBase}/api${normalizedPath}`;
  }

  async getDevices(): Promise<Device[]> {
    const base = this.getBaseUrl();
    if (!base) {
      // Kein Backend konfiguriert — Mock zurückgeben
      return this.devices.slice();
    }

    // Use MariaDB-backed HA snapshot first (fast, stable)
    const url = `${base}/api/homeassistant/db/devices`;
    try {
      const headers = this.buildHeaders();
      const res = await firstValueFrom(this.http.get<any[]>(url, headers ? { headers } : {}));
      const list = Array.isArray(res) ? res : [];

      // Map HA device rows to UI Device shape
      return list.map((d: any) => ({
        id: d.deviceId || d.device_id || d.id,
        name: d.name || d.deviceId || d.device_id || 'Unnamed',
        type: d.manufacturer || d.model || 'device',
        actions: [],
      })) as Device[];
    } catch (err) {
      console.warn('getDevices(): Backend-Fehler, verwende Mock-Daten', err);
      return this.devices.slice();
    }
  }

  async getDeviceById(deviceId: string): Promise<Device | undefined> {
    const base = this.getBaseUrl();
    if (!base) {
      return Promise.resolve(this.devices.find(d => d.id === deviceId)).then();
    }

    const url = this.buildUrl(`/devices/${encodeURIComponent(deviceId)}`);
    try {
      const headers = this.buildHeaders();
      const res = await firstValueFrom(this.http.get<Device>(url, headers ? { headers } : {}));
      return res;
    } catch (err) {
      console.warn('getDeviceById(): Backend-Fehler, verwende Mock-Daten', err);
      return this.devices.find(d => d.id === deviceId);
    }
  }

  async getActionsForDevice(deviceId: string): Promise<DeviceAction[]> {
    const base = this.getBaseUrl();
    if (!base) {
      const d = this.devices.find(dv => dv.id === deviceId);
      return Promise.resolve(d?.actions ? d.actions.slice() : []).then();
    }

    // TODO: Map real HA services to device-specific actions.
    // For now, return the mock actions for known mock devices.
    const d = this.devices.find(dv => dv.id === deviceId);
    return d?.actions ? d.actions.slice() : [];
  }

  async executeAction(deviceId: string, actionId: string, params?: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const base = this.getBaseUrl();
    if (!base) {
      // Simuliere Ausführung lokal
      return new Promise(resolve => {
        setTimeout(() => {
          const device = this.devices.find(d => d.id === deviceId);
          const action = device?.actions.find(a => a.id === actionId);
          if (!device) { resolve({ success: false, message: 'Gerät nicht gefunden (Mock)' }); return; }
          if (!action) { resolve({ success: false, message: 'Aktion nicht gefunden (Mock)' }); return; }
          const paramInfo = params && Object.keys(params).length ? ` mit Parametern ${JSON.stringify(params)}` : '';
          resolve({ success: true, message: `Mock: Aktion "${action.name}" auf "${device.name}" ausgeführt${paramInfo}.` });
        }, 300);
      });
    }

    const url = this.buildUrl(`/devices/${encodeURIComponent(deviceId)}/actions/${encodeURIComponent(actionId)}`);
    try {
      const headers = this.buildHeaders();
      const res = await firstValueFrom(this.http.post<{ success: boolean; message: string }>(url, params || {}, headers ? { headers } : {}));
      return res || { success: false, message: 'Leere Antwort vom Backend' };
    } catch (err) {
      console.warn('executeAction(): Backend-Fehler, Fallback auf Mock', err);
      // Fallback: gleiche Logik wie Mock-Ausführung
      const device = this.devices.find(d => d.id === deviceId);
      const action = device?.actions.find(a => a.id === actionId);
      if (!device) { return { success: false, message: 'Gerät nicht gefunden (Fallback)' }; }
      if (!action) { return { success: false, message: 'Aktion nicht gefunden (Fallback)' }; }
      const paramInfo = params && Object.keys(params).length ? ` mit Parametern ${JSON.stringify(params)}` : '';
      return { success: true, message: `Fallback: Aktion "${action.name}" auf "${device.name}" ausgeführt${paramInfo}.` };
    }
  }
}
