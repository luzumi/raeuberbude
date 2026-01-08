import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service für HomeAssistant-Daten-Zugriff
 * Nutzt die Nest-Backend-API unter /api/homeassistant/*
 */
@Injectable({
  providedIn: 'root'
})
export class HomeAssistantService {
  private readonly apiBase: string;

  constructor(private http: HttpClient) {
    // Use relative path to avoid double /api/api/ issues and work with proxy
    this.apiBase = '/api/homeassistant';
  }

  /**
   * Alle Entities laden
   */
  getAllEntities(domain?: string): Observable<any[]> {
    const params: any = {};
    if (domain) params.domain = domain;
    return this.http.get<any[]>(`${this.apiBase}/db/entities`, {
      params,
      withCredentials: true
    });
  }

  /**
   * Entity nach ID laden
   */
  getEntityById(entityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/entities/${entityId}`, {
      withCredentials: true
    });
  }

  /**
   * Entities durchsuchen
   */
  searchEntities(searchTerm: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/entities/search`, {
      params: { q: searchTerm },
      withCredentials: true
    });
  }

  /**
   * Entity-Statistiken laden
   */
  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/statistics`, {
      withCredentials: true
    });
  }

  /**
   * Alle Devices laden
   */
  getAllDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/devices`, {
      withCredentials: true
    });
  }

  /**
   * Device nach ID laden
   */
  getDeviceById(deviceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/devices/${deviceId}`, {
      withCredentials: true
    });
  }

  /**
   * Alle Areas laden
   */
  getAllAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/areas`, {
      withCredentials: true
    });
  }

  /**
   * Area nach ID laden
   */
  getAreaById(areaId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/areas/${areaId}`, {
      withCredentials: true
    });
  }

  /**
   * Alle verfügbaren Domänen laden (27 unterstützte HA-Domänen)
   */
  getAllDomains(): Observable<{ success: boolean; domains: string[]; domainCounts: { domain: string; count: number }[]; count: number }> {
    return this.http.get<any>(`${this.apiBase}/db/domains`, {
      withCredentials: true
    });
  }

  /**
   * Entities für eine bestimmte Domäne laden
   */
  getEntitiesByDomain(domain: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/domains/${domain}/entities`, {
      withCredentials: true
    });
  }

  /**
   * Alle Automations laden (domain=automation)
   */
  getAllAutomations(): Observable<any[]> {
    return this.getEntitiesByDomain('automation');
  }

  /**
   * Alle Persons laden
   */
  getAllPersons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/persons`, {
      withCredentials: true
    });
  }

  /**
   * Alle Zones laden (domain=zone)
   */
  getAllZones(): Observable<any[]> {
    return this.getEntitiesByDomain('zone');
  }

  /**
   * Alle Media Players laden (domain=media_player)
   */
  getAllMediaPlayers(): Observable<any[]> {
    return this.getEntitiesByDomain('media_player');
  }

  /**
   * Alle Lights laden (domain=light)
   */
  getAllLights(): Observable<any[]> {
    return this.getEntitiesByDomain('light');
  }

  /**
   * Alle Switches laden (domain=switch)
   */
  getAllSwitches(): Observable<any[]> {
    return this.getEntitiesByDomain('switch');
  }

  /**
   * Alle Sensors laden (domain=sensor)
   */
  getAllSensors(): Observable<any[]> {
    return this.getEntitiesByDomain('sensor');
  }

  /**
   * Alle Binary Sensors laden (domain=binary_sensor)
   */
  getAllBinarySensors(): Observable<any[]> {
    return this.getEntitiesByDomain('binary_sensor');
  }

  /**
   * Alle Services laden
   */
  getAllServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/services`, {
      withCredentials: true
    });
  }

  /**
   * Daten neu importieren
   */
  reimportData(): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/import/reimport`, {}, {
      withCredentials: true
    });
  }

  /**
   * Entity-State abrufen (TODO: Backend-Implementierung fehlt)
   */
  getEntityState(entityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/entities/${entityId}/state`, {
      withCredentials: true
    });
  }

  /**
   * Entity-History abrufen (TODO: Backend-Implementierung fehlt)
   */
  getEntityHistory(entityId: string, startDate?: Date, endDate?: Date): Observable<any[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<any[]>(`${this.apiBase}/db/entities/${entityId}/history`, {
      params,
      withCredentials: true
    });
  }

  /**
   * Devices in einer Area laden
   */
  getDevicesByArea(areaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/areas/${areaId}/devices`, {
      withCredentials: true
    });
  }

  /**
   * Persons in einer Zone laden (TODO: Backend-Implementierung fehlt)
   */
  getPersonsInZone(zoneName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/db/zones/${zoneName}/persons`, {
      withCredentials: true
    });
  }

  /**
   * Person-Location abrufen (TODO: Backend-Implementierung fehlt)
   */
  getPersonLocation(personId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/persons/${personId}/location`, {
      withCredentials: true
    });
  }

  /**
   * Automation nach ID laden (TODO: Backend-Implementierung fehlt)
   */
  getAutomationById(automationId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/automations/${automationId}`, {
      withCredentials: true
    });
  }

  /**
   * Service-Details abrufen (TODO: Backend-Implementierung fehlt)
   */
  getService(domain: string, service: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/db/services/${domain}/${service}`, {
      withCredentials: true
    });
  }
}

