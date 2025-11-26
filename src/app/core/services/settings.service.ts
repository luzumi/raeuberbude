import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';

export interface LlmRuntimeConfig {
  url: string;
  model: string;
  fallbackModel?: string;
  useGpu?: boolean;
  timeoutMs?: number;
  targetLatencyMs?: number;
  maxTokens?: number;
  temperature?: number;
  confidenceShortcut?: number;
  heuristicBypass?: boolean;
  provider?: string;
  apiKey?: string;
  // Optionaler System-Prompt, wird beim Test/Anfrage als erste System-Nachricht verwendet
  systemPrompt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl: string;
  private readonly config$ = new BehaviorSubject<LlmRuntimeConfig | null>(null);

  constructor(private readonly http: HttpClient) {
    const base = resolveBackendBase(environment.backendApiUrl || environment.apiUrl);
    this.apiUrl = `${base}/api`;
  }

  /**
   * Load runtime configuration from backend
   * Merges runtime config with environment defaults
   */
  load(): Observable<LlmRuntimeConfig> {
    return this.http.get<any>(`${this.apiUrl}/llm-config`).pipe(
      tap(config => {
        // Normalize URL - remove trailing /v1/chat/completions if present
        if (config.url) {
          config.url = this.normalizeUrl(config.url);
        }
        this.config$.next(config);
      }),
      catchError(err => {
        console.error('Failed to load LLM config, using environment defaults', err);
        // Fallback to environment
        const fallback = { ...environment.llm } as LlmRuntimeConfig;
        this.config$.next(fallback);
        return throwError(() => err);
      })
    );
  }

  /**
   * Save runtime configuration to backend
   */
  save(config: Partial<LlmRuntimeConfig>): Observable<any> {
    // Normalize URL before saving
    if (config.url) {
      config.url = this.normalizeUrl(config.url);
    }

    return this.http.post(`${this.apiUrl}/llm-config`, config).pipe(
      tap(response => {
        const merged = { ...this.config$.value, ...config } as LlmRuntimeConfig;
        this.config$.next(merged);
      })
    );
  }

  /**
   * Get current configuration as observable
   */
  get config(): Observable<LlmRuntimeConfig | null> {
    return this.config$.asObservable();
  }

  /**
   * Get current configuration value (sync)
   */
  get current(): LlmRuntimeConfig | null {
    return this.config$.value;
  }

  /**
   * Normalize LLM URL - extract base URL without endpoints
   */
  private normalizeUrl(url: string): string {
    try {
      // Remove common endpoint paths
      let normalized = url
        .replace(/\/v1\/chat\/completions\/?$/, '')
        .replace(/\/chat\/completions\/?$/, '')
        .replace(/\/v1\/models\/?$/, '')
        .replace(/\/models\/?$/, '')
        .replace(/\/$/, ''); // Remove trailing slash

      // Validate it's a proper URL
      const parsed = new URL(normalized);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
    } catch (e) {
      console.warn('Failed to normalize URL, returning as-is:', url);
      return url;
    }
  }

  /**
   * Get full chat completions endpoint URL
   */
  getChatCompletionsUrl(): string {
    const cfg = this.current;
    if (!cfg || !cfg.url) {
      return `${environment.llm.url}/v1/chat/completions`;
    }
    return `${cfg.url}/v1/chat/completions`;
  }

  /**
   * Get models endpoint URL
   */
  getModelsUrl(): string {
    const cfg = this.current;
    if (!cfg || !cfg.url) {
      return `${environment.llm.url}/v1/models`;
    }
    return `${cfg.url}/v1/models`;
  }
}
