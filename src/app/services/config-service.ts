// src/app/services/config-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  homeAssistantUrl: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig = { homeAssistantUrl: '', token: '' };

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(this.http.get<AppConfig>('/assets/config.json'));
      this.config = cfg;
    } catch (err) {
      console.error('Konfiguration konnte nicht geladen werden:', err);
      this.config = { homeAssistantUrl: '', token: '' };
    }
  }

  get homeAssistantUrl() { return this.config.homeAssistantUrl; }
  get token() { return this.config.token; }
}
