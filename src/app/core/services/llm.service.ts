import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LlmInstance } from '../models/llm-instance.model';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';

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

  activate(id: string): Observable<LlmInstance> {
    return this.http.post<LlmInstance>(`${this.apiUrl}/${id}/activate`, {});
  }

  getSystemPrompt(id: string): Observable<{ systemPrompt: string }> {
    return this.http.get<{ systemPrompt: string }>(`${this.apiUrl}/${id}/system-prompt`);
  }

  setSystemPrompt(id: string, systemPrompt: string): Observable<LlmInstance> {
    return this.http.put<LlmInstance>(`${this.apiUrl}/${id}/system-prompt`, { systemPrompt });
  }

  async testConnection(instance: LlmInstance): Promise<boolean> {
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
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
