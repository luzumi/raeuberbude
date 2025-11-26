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
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.apiBase = `http://${host}:${port}/api/homeassistant`;
  }

  /**
   * Alle Entities laden
   */
  getAllEntities(type?: string): Observable<any[]> {
    const params: any = {};
    if (type) params.type = type;
    return this.http.get<any[]>(`${this.apiBase}/entities`, {
      params,
      withCredentials: true
    });
  }

  /**
   * Entity nach ID laden
   */
  getEntityById(entityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/entities/${entityId}`, {
      withCredentials: true
    });
  }

  /**
   * Entities durchsuchen
   */
  searchEntities(searchTerm: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/search`, {
      params: { q: searchTerm },
      withCredentials: true
    });
  }

  /**
   * Entity-Statistiken laden
   */
  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/entities/statistics`, {
      withCredentials: true
    });
  }

  /**
   * Alle Devices laden
   */
  getAllDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/devices`, {
      withCredentials: true
    });
  }

  /**
   * Device nach ID laden
   */
  getDeviceById(deviceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/entities/devices/${deviceId}`, {
      withCredentials: true
    });
  }

  /**
   * Alle Areas laden
   */
  getAllAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/areas`, {
      withCredentials: true
    });
  }

  /**
   * Area nach ID laden
   */
  getAreaById(areaId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/entities/areas/${areaId}`, {
      withCredentials: true
    });
  }

  /**
   * Alle Automations laden
   */
  getAllAutomations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/automations`, {
      withCredentials: true
    });
  }

  /**
   * Alle Persons laden
   */
  getAllPersons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/persons`, {
      withCredentials: true
    });
  }

  /**
   * Alle Zones laden
   */
  getAllZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/zones`, {
      withCredentials: true
    });
  }

  /**
   * Alle Media Players laden
   */
  getAllMediaPlayers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/media-players`, {
      withCredentials: true
    });
  }

  /**
   * Alle Services laden
   */
  getAllServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/services`, {
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
}

