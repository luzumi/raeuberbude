import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LlmInstance } from '../models/llm-instance.model';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private readonly apiUrl: string;

  constructor(private http: HttpClient) {
    const base = resolveBackendBase(environment.backendApiUrl || environment.apiUrl);
    this.apiUrl = `${base}/api/llm-instances`;
  }

  listInstances(): Observable<LlmInstance[]> {
    return this.http.get<LlmInstance[]>(this.apiUrl);
  }

  scan(): Observable<LlmInstance[]> {
    return this.http.post<LlmInstance[]>(`${this.apiUrl}/scan`, {});
  }

   /**
   * Fetch available models from an LLM instance (GET /v1/models)
   * Returns array of model ids (strings)
   */
  getModels(instanceUrl: string): Observable<string[]> {
     try {
      const candidates = new Set<string>();
      // primary replace if typical path is provided
      if (instanceUrl.includes('/chat/completions')) {
        candidates.add(instanceUrl.replace('/chat/completions', '/models'));
      }
      try {
        const u = new URL(instanceUrl);
        candidates.add(`${u.origin}/v1/models`);
        candidates.add(`${u.origin}/models`);
      } catch (e) {
        // ignore url parsing
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
}
