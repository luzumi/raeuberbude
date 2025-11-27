import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';

export interface TranscriptionMetrics {
  audioDurationMs?: number;
  transcriptionDurationMs?: number;
  provider?: string;
  language?: string;
  recordingStartedAt?: number;
  clientNow?: number;
  [key: string]: any;
}

/**
 * Service für Persistierung von Spracheingaben in der Datenbank
 * Loggt Transkripte mit Context und Metriken für Analytics
 */
@Injectable({
  providedIn: 'root'
})
export class SpeechPersistenceService {
  private readonly apiUrl: string;
  private sessionId: string;
  private currentUserId: string = 'anonymous';

  constructor(private readonly http: HttpClient) {
    // Use absolute backend URL in production, relative in tests
    const runningUnderTest = typeof (globalThis as any).__karma__ !== 'undefined' ||
                              !!(globalThis as any).__UNIT_TEST_MODE;
    this.apiUrl = runningUnderTest
      ? '/api/speech'
      : `${resolveBackendBase(environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001')}/api/speech`;

    this.sessionId = this.generateSessionId();
  }

  /**
   * Speichert ein Transkript in der Datenbank
   */
  async saveTranscript(
    transcript: string,
    confidence: number,
    terminalId: string | null,
    metrics?: TranscriptionMetrics
  ): Promise<void> {
    try {
      const body: any = {
        userId: this.currentUserId,
        inputText: transcript,
        inputType: 'speech',
        context: {
          confidence,
          device: this.getDeviceType(),
          browser: navigator.userAgent.substring(0, 120),
          sessionId: this.sessionId,
          location: globalThis.location?.pathname || '/',
        },
        metadata: {
          provider: metrics?.provider,
          language: metrics?.language,
          audioDurationMs: metrics?.audioDurationMs,
          transcriptionDurationMs: metrics?.transcriptionDurationMs,
          recordingStartedAt: metrics?.recordingStartedAt,
          clientNow: metrics?.clientNow,
          ...metrics
        }
      };

      // Nur Mongo-ID terminalId anhängen falls vorhanden
      if (terminalId && /^[a-f0-9]{24}$/i.test(terminalId)) {
        body.terminalId = terminalId;
      }

      await lastValueFrom(
        this.http.post(`${this.apiUrl}/input`, body, { withCredentials: true })
      );

      console.log('[SpeechPersistence] Transcript saved:', transcript.substring(0, 50));
    } catch (error: any) {
      console.warn('[SpeechPersistence] Failed to save transcript:', error?.message || error);
      // Nicht werfen - Persistierung ist nicht kritisch für den User-Flow
    }
  }

  /**
   * Setzt die aktuelle User-ID
   */
  setUserId(userId: string): void {
    this.currentUserId = userId || 'anonymous';
    console.log('[SpeechPersistence] User ID set to:', this.currentUserId);
  }

  /**
   * Gibt die aktuelle User-ID zurück
   */
  getUserId(): string {
    return this.currentUserId;
  }

  /**
   * Gibt die aktuelle Session-ID zurück
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Generiert eine neue Session-ID (z.B. nach Page-Reload)
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    console.log('[SpeechPersistence] New session ID:', this.sessionId);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getDeviceType(): string {
    const width = globalThis.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}

