import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
    const isPlaceholder = (cfg: any) => {
      const msg = String(cfg?.message || '').toLowerCase();
      return msg.includes('not implemented') || msg.includes('removed');
    };

    const normalizeRole = (role: any): 'primary' | 'secondary' | 'other' => {
      const r = String(role || '').toLowerCase();
      if (r === 'primary') return 'primary';
      if (r === 'secondary') return 'secondary';
      return 'other';
    };

    const pickBestInstance = (instances: any[]): any | null => {
      const list = Array.isArray(instances) ? instances : [];
      if (list.length === 0) return null;

      const byRole = (wanted: 'primary' | 'secondary') =>
        list.find(i => normalizeRole(i?.role) === wanted && (i?.enabled !== false));

      return (
        byRole('primary') ||
        byRole('secondary') ||
        list.find(i => i?.isActive && (i?.enabled !== false)) ||
        list.find(i => i?.enabled !== false) ||
        list[0]
      );
    };

    const toRuntimeConfigFromInstance = (inst: any): LlmRuntimeConfig => {
      const url = inst?.url ? this.normalizeUrl(String(inst.url)) : '';
      const cfg = inst?.config || {};
      return {
        url,
        model: String(inst?.model || ''),
        fallbackModel: String(cfg?.fallbackModel || ''),
        useGpu: cfg?.useGpu,
        timeoutMs: cfg?.timeoutMs,
        targetLatencyMs: cfg?.targetLatencyMs,
        maxTokens: cfg?.maxTokens,
        temperature: cfg?.temperature,
        confidenceShortcut: cfg?.confidenceShortcut,
        heuristicBypass: cfg?.heuristicBypass,
        systemPrompt: inst?.systemPrompt || cfg?.systemPrompt
      };
    };

    return this.http.get<any>(`${this.apiUrl}/llm-config`).pipe(
      switchMap(cfg => {
        // If backend returns a placeholder (Nest logging controller stub), derive config from llm-instances.
        if (!cfg || isPlaceholder(cfg)) {
          return this.http.get<any>(`${this.apiUrl}/llm-instances`).pipe(
            map(instances => {
              const best = pickBestInstance(instances);
              if (!best) {
                return { ...environment.llm } as LlmRuntimeConfig;
              }
              return toRuntimeConfigFromInstance(best);
            })
          );
        }

        // Normalize URL - remove trailing /v1/chat/completions if present
        if (cfg.url) {
          cfg.url = this.normalizeUrl(cfg.url);
        }
        return of(cfg as LlmRuntimeConfig);
      }),
      tap(config => {
        this.config$.next(config);
      }),
      catchError(err => {
        console.error('Failed to load LLM config, using environment defaults', err);
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
    } catch (error) {
        if (error instanceof Error) {
            console.warn(`Failed to normalize URL '${url}': ${error.message}`);
        } else {
            console.warn(`Failed to normalize URL '${url}': Unknown error occurred`);
        }
        throw new Error(`Invalid URL format: ${url}. Please provide a valid URL.`);
    }
  }

  /**
   * Get full chat completions endpoint URL
   */
  getChatCompletionsUrl(): string {
    const cfg = this.current;
    return `${cfg?.url || environment.llm.url}/v1/chat/completions`;
  }

  /**
   * Get models endpoint URL
   */
  getModelsUrl(): string {
    const cfg = this.current;
    return `${cfg?.url || environment.llm.url}/v1/models`;
  }
}
