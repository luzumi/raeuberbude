import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { IntentRecognitionResult } from '../models/intent-recognition.model';
import { SettingsService } from './settings.service';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  issues?: string[];
  intent?: IntentRecognitionResult;
  model?: string;
  raw?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionValidatorRuntimeService {
  constructor(
    private readonly http: HttpClient,
    private readonly settings: SettingsService
  ) {}

  /**
   * Build backend URL for transcript validation.
   *
   * - Default (dev/proxy): relative `/api/speech/validate`
   * - If SettingsService has an absolute backend base (`apiUrl`), use it.
   */
  private buildValidateUrl(): string {
    const base = String((this.settings as any)?.apiUrl || '').trim();
    if (!base) return '/api/speech/validate';

    // SettingsService.apiUrl is `${base}/api` (see settings.service.ts)
    // Therefore we append `/speech/validate` here.
    const normalizedBase = base.replace(/\/+$/, '');
    return `${normalizedBase}/speech/validate`;
  }

  async validate(
    transcript: string,
    originalConfidence: number,
    _useServer: boolean = false,
    _context?: { location?: string; userId?: string; terminalId?: string }
  ): Promise<ValidationResult> {
    const t = (transcript || '').trim();

    if (!t || t.length < 2) {
      return {
        isValid: false,
        confidence: 0,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.',
        issues: ['Leeres oder zu kurzes Transkript']
      };
    }

    // Basic heuristic: low STT confidence -> ask
    if (originalConfidence > 0 && originalConfidence < 0.6) {
      return {
        isValid: false,
        confidence: originalConfidence,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich bin mir nicht sicher. Können Sie das bitte wiederholen?',
        issues: ['Niedrige STT-Konfidenz']
      };
    }

    try {
      const url = this.buildValidateUrl();

      const payload: any = {
        transcript: t,
        confidence: originalConfidence,
        context: {
          location: _context?.location || (globalThis as any)?.location?.pathname || '/',
          userId: _context?.userId,
          terminalId: _context?.terminalId,
        }
      };

      const resp = await lastValueFrom(
        this.http.post<any>(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        })
      );

      // Backend returns ValidationResultDto. Normalize defensively.
      return {
        isValid: resp?.isValid !== false,
        confidence: typeof resp?.confidence === 'number' ? resp.confidence : originalConfidence,
        hasAmbiguity: !!resp?.hasAmbiguity,
        suggestions: Array.isArray(resp?.suggestions) ? resp.suggestions : undefined,
        clarificationNeeded: !!resp?.clarificationNeeded,
        clarificationQuestion: typeof resp?.clarificationQuestion === 'string' ? resp.clarificationQuestion : undefined,
        issues: Array.isArray(resp?.issues) ? resp.issues : undefined,
        intent: resp?.intent as IntentRecognitionResult | undefined,
        model: typeof resp?.model === 'string' ? resp.model : undefined,
        raw: resp?.raw,
      };
    } catch (e: any) {
      const msg = String(e?.error?.message || e?.message || e || '');
      throw new Error(`Backend nicht erreichbar: ${msg}`);
    }
  }
}
