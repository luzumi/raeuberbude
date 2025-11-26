import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { LlmInstance } from '../models/llm-instance.model';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';
import { map } from 'rxjs/operators';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private readonly apiUrl: string;

  constructor(
    private readonly http: HttpClient,
    private readonly settings: SettingsService
  ) {
    const base = resolveBackendBase(environment.backendApiUrl || environment.apiUrl);
    this.apiUrl = `${base}/api/llm-instances`;
  }

  listInstances(): Observable<LlmInstance[]> {
    return this.http.get<LlmInstance[]>(this.apiUrl);
  }

  scan(): Observable<LlmInstance[]> {
    return this.http.post<LlmInstance[]>(`${this.apiUrl}/scan`, {});
  }

  load(id: string): Observable<LlmInstance & { loadResult?: { success: boolean; message?: string; error?: string } }> {
    return this.http.post<LlmInstance & { loadResult?: { success: boolean; message?: string; error?: string } }>(`${this.apiUrl}/${id}/load`, {});
  }

  eject(id: string): Observable<LlmInstance & { ejectResult?: { success: boolean; message?: string; error?: string } }> {
    return this.http.post<LlmInstance & { ejectResult?: { success: boolean; message?: string; error?: string } }>(`${this.apiUrl}/${id}/eject`, {});
  }

  delete(id: string): Observable<{ success: boolean; deletedInstance: LlmInstance }> {
    return this.http.post<{ success: boolean; deletedInstance: LlmInstance }>(`${this.apiUrl}/${id}/delete`, {});
  }

   /**
   * Fetch available models from an LLM instance (GET /v1/models)
   * Returns array of model ids (strings)
   */
  getModels(instanceUrl: string): Observable<string[]> {
     try {
      const candidates = new Set<string>();

      // Normalize URL: remove trailing slashes
      let normalizedUrl = instanceUrl.trim().replace(/\/+$/, '');

      // primary replace if typical path is provided
      if (normalizedUrl.includes('/chat/completions')) {
        candidates.add(normalizedUrl.replace('/chat/completions', '/models'));
        candidates.add(normalizedUrl.replace('/v1/chat/completions', '/v1/models'));
      }

      try {
        const u = new URL(normalizedUrl);
        // LM Studio standard endpoints
        candidates.add(`${u.origin}/v1/models`);
        candidates.add(`${u.origin}/models`);

        // If URL has a path, try adding /models to the path
        if (u.pathname && u.pathname !== '/') {
          const basePath = u.pathname.replace(/\/+$/, '');
          candidates.add(`${u.origin}${basePath}/v1/models`);
          candidates.add(`${u.origin}${basePath}/models`);
        }
      } catch (e) {
        // If URL parsing fails, try simple concatenation
        candidates.add(`${normalizedUrl}/v1/models`);
        candidates.add(`${normalizedUrl}/models`);
      }

      const tryFetch = (url: string) => this.http.get<any>(url).pipe(
         map(resp => {
           if (!resp) return [];
           // If resp is an array of models
           if (Array.isArray(resp)) {
             return resp.map((r: any) => r.id).filter(Boolean);
           }

           // If resp is { object: 'list', data: [...] }
           if (Array.isArray((resp as any).data)) {
             return (resp as any).data.map((d: any) => d.id).filter(Boolean);
           }

           // Single model object
           if ((resp as any).id) {
             return [ (resp as any).id ];
           }

           return [];
         })
      );

      // Try candidates sequentially until one yields models
      const obs = new Observable<string[]>(sub => {
        const urls = Array.from(candidates);
        let i = 0;
        const next = () => {
          if (i >= urls.length) { sub.next([]); sub.complete(); return; }
          const url = urls[i++];
          tryFetch(url).subscribe({
            next: (models: string[]) => {
              if (models && models.length > 0) { sub.next(models); sub.complete(); }
              else next();
             },
             error: () => next()
           });
         };
         next();
       });
       return obs;
     } catch (e) {
       return new Observable<string[]>(sub => { sub.next([]); sub.complete(); });
     }
   }

  getSystemPrompt(id: string): Observable<{ systemPrompt: string }> {
    return this.http.get<{ systemPrompt: string }>(`${this.apiUrl}/${id}/system-prompt`);
  }

  setSystemPrompt(id: string, systemPrompt: string): Observable<LlmInstance> {
    return this.http.put<LlmInstance>(`${this.apiUrl}/${id}/system-prompt`, { systemPrompt });
  }

  async testConnection(instance: LlmInstance): Promise<{ loaded: boolean; source?: string; details?: any }> {
    // If instance has no id, fallback to basic HTTP probe
    if (!instance?._id) {
      try {
        const testUrl = instance.url.replace('/chat/completions', '/models');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal as any
        });
        clearTimeout(timeout);
        return { loaded: response.ok, source: 'http', details: { status: response.status } };
      } catch (error: any) {
        console.error('Connection test failed (http fallback):', error);
        return { loaded: false, source: 'http', details: { error: error?.message || String(error) } };
      }
    }

    try {
      // Call backend to determine model status (MCP preferred)
      const res = await lastValueFrom(this.http.get<any>(`${this.apiUrl}/${instance._id}/model-status`));
      // expected res: { source: 'mcp'|'http'|'none', loaded: boolean, details: any }
      return { loaded: !!res.loaded, source: res.source, details: res.details };
    } catch (error: any) {
      console.error('Connection test failed (backend):', error);
      return { loaded: false, source: 'backend', details: { error: error?.message || String(error) } };
    }
  }
}
