import {
  ApplicationConfig, inject, provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http'
import { ConfigService } from '@services/config-service';
import { SettingsService } from './core/services/settings.service';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideAppInitializer(()=> inject(ConfigService).load()),
    provideAppInitializer(()=> {
      const settings = inject(SettingsService);
      settings.load().subscribe({
        next: () => console.log('LLM settings loaded'),
        error: (e) => console.error('Failed to load LLM settings', e)
      });
    }),
  ]
};
