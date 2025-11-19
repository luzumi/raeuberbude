import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { LlmInstance } from '../models/llm-instance.model';

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private readonly apiUrl = '/api/llm-instances';

  constructor(private http: HttpClient) {}

  /**
   * Get all enabled LLM instances
   */
  async listInstances(): Promise<LlmInstance[]> {
    return await lastValueFrom(
      this.http.get<LlmInstance[]>(this.apiUrl)
    );
  }

  /**
   * Trigger manual LLM scan
   */
  async scanInstances(): Promise<{ success: boolean; instances: LlmInstance[] }> {
    return await lastValueFrom(
      this.http.post<{ success: boolean; instances: LlmInstance[] }>(
        `${this.apiUrl}/scan`,
        {}
      )
    );
  }

  /**
   * Activate an LLM instance
   */
  async activate(id: string): Promise<{ success: boolean; instance: LlmInstance }> {
    return await lastValueFrom(
      this.http.post<{ success: boolean; instance: LlmInstance }>(
        `${this.apiUrl}/${id}/activate`,
        {}
      )
    );
  }

  /**
   * Get system prompt for an LLM instance
   */
  async getSystemPrompt(id: string): Promise<{ systemPrompt: string }> {
    return await lastValueFrom(
      this.http.get<{ systemPrompt: string }>(
        `${this.apiUrl}/${id}/system-prompt`
      )
    );
  }

  /**
   * Update system prompt for an LLM instance
   */
  async setSystemPrompt(id: string, systemPrompt: string): Promise<{ success: boolean; systemPrompt: string }> {
    return await lastValueFrom(
      this.http.put<{ success: boolean; systemPrompt: string }>(
        `${this.apiUrl}/${id}/system-prompt`,
        { systemPrompt }
      )
    );
  }

  /**
   * Test connection to an LLM instance
   */
  async testConnection(id: string): Promise<{ success: boolean; health: any }> {
    return await lastValueFrom(
      this.http.post<{ success: boolean; health: any }>(
        `${this.apiUrl}/${id}/test`,
        {}
      )
    );
  }

  /**
   * Get instances as Observable (for reactive forms)
   */
  listInstances$(): Observable<LlmInstance[]> {
    return this.http.get<LlmInstance[]>(this.apiUrl);
  }
}
