import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface SyncResult {
  success: boolean;
  message?: string;
  data?: {
    areas?: number;
    devices?: number;
    entities?: number;
    automations?: number;
    persons?: number;
    zones?: number;
    media_players?: number;
    services?: number;
  };
  count?: number;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  error?: string;
}

export interface DomainsResult {
  success: boolean;
  domains?: string[];
  count?: number;
}

/**
 * Service für die Synchronisation von Home Assistant Daten
 * über die Backend Live-Sync API
 */
@Injectable({ providedIn: 'root' })
export class HaSyncService {
  private readonly homeAssistantUrl = `${environment.backendApiUrl}/api/ha/sync`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Synchronisiert alle Daten (Areas, Devices, Entities) von Home Assistant
   */
  syncAll(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/all`, {}).pipe(
      tap(result => {
        if (result.success) {
          console.log('✅ HA Sync erfolgreich:', result.data);
        } else {
          console.error('❌ HA Sync fehlgeschlagen:', result.error);
        }
      })
    );
  }

  /**
   * Synchronisiert nur Areas von Home Assistant
   */
  syncAreas(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/areas`, {}).pipe(
      tap(result => console.log('Areas synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert nur Devices von Home Assistant
   */
  syncDevices(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/devices`, {}).pipe(
      tap(result => console.log('Devices synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert nur Entities von Home Assistant
   */
  syncEntities(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/entities`, {}).pipe(
      tap(result => console.log('Entities synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert Automations
   */
  syncAutomations(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/automations`, {}).pipe(
      tap(result => console.log('Automations synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert Personen
   */
  syncPersons(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/persons`, {}).pipe(
      tap(result => console.log('Persons synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert Zonen
   */
  syncZones(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/zones`, {}).pipe(
      tap(result => console.log('Zones synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert Media Players
   */
  syncMediaPlayers(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/media_players`, {}).pipe(
      tap(result => console.log('Media players synchronisiert:', result.count))
    );
  }

  /**
   * Synchronisiert Services
   */
  syncServices(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.homeAssistantUrl}/services`, {}).pipe(
      tap(result => console.log('Services synchronisiert:', result.count))
    );
  }

  /**
   * Testet die Verbindung zum Home Assistant
   */
  testConnection(): Observable<ConnectionTestResult> {
    return this.http.get<ConnectionTestResult>(`${this.homeAssistantUrl}/test`);
  }

  /**
   * Ruft alle verfügbaren Entity-Domains ab (light, switch, sensor, etc.)
   */
  getDomains(): Observable<DomainsResult> {
    return this.http.get<DomainsResult>(`${this.homeAssistantUrl}/domains`);
  }

  /**
   * Führt einen vollständigen Sync durch und gibt eine Benachrichtigung aus
   */
  syncWithNotification(): Observable<SyncResult> {
    console.log('🔄 Starte Home Assistant Synchronisation...');
    return this.syncAll().pipe(
      tap(result => {
        if (result.success && result.data) {
          const { areas, devices, entities } = result.data;
          console.log(
            `✅ Sync abgeschlossen: ${areas} Areas, ${devices} Devices, ${entities} Entities`
          );
          // Optional: Toast-Notification anzeigen
          // this.notificationService.success(`HA Sync: ${devices} Geräte, ${entities} Entities`);
        }
      })
    );
  }
}
