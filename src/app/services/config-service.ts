// src/app/services/config-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';

export interface AppConfig {
  homeAssistantUrl: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config!: AppConfig;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(this.http.get<AppConfig>('/assets/config.json'));
      // Fallback auf das aktuelle Hostname, wenn keine URL in der Konfiguration
      // vorhanden ist. Dadurch funktioniert die App auch bei externem Zugriff.
      this.config = {
        homeAssistantUrl: cfg.homeAssistantUrl || `http://${window.location.hostname}:8123`,
        token: cfg.token || environment.token
      };
    } catch (err) {
      console.error('Konfiguration konnte nicht geladen werden:', err);
      // Nutzt ebenfalls den aktuellen Host als Fallback und den Token aus dem Environment
      this.config = {
        homeAssistantUrl: `http://${window.location.hostname}:8123`,
        token: environment.token
      };
    }
  }

  // Zugriff auf die geladenen Konfigurationswerte
  get homeAssistantUrl() { return this.config.homeAssistantUrl; }
  get token() { return this.config.token; }
}
