// src/app/services/config-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  // Base URL is no longer required; API calls go through the proxy
  token: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config!: AppConfig;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(this.http.get<AppConfig>('/assets/config.json'));
      this.config = cfg;
    } catch (err) {
      console.error('Konfiguration konnte nicht geladen werden:', err);
      // fall back to an empty token if config is missing
      this.config = { token: '' };
    }
  }

  get token() { return this.config.token; }
}
