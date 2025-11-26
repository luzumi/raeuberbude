import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TranscriptionRequest {
  audioBlob: Blob;
  mimeType: string;
  language?: string;
  maxDurationMs?: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  provider: string;
  language: string;
  audioDurationMs?: number;
  transcriptionDurationMs?: number;
}

/**
 * Verantwortlich für Server-basierte Transkription (Vosk/Whisper Backend)
 * Keine UI-Logik, nur HTTP-Kommunikation
 */
@Injectable({
  providedIn: 'root'
})
export class SpeechTranscriptionService {
  private readonly apiUrl = `${environment.backendApiUrl}/api/speech`;

  constructor(private readonly http: HttpClient) {}

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', request.audioBlob, 'recording.webm');
    formData.append('language', request.language || 'de-DE');
    formData.append('maxDurationMs', String(request.maxDurationMs || 30000));

    try {
      const response: any = await lastValueFrom(
        this.http.post(`${this.apiUrl}/transcribe`, formData, {
          withCredentials: true
        })
      );

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || response?.message || 'Transcription failed');
      }

      const data = response.data;
      return {
        transcript: data.transcript,
        confidence: data.confidence,
        provider: data.provider,
        language: data.language || request.language || 'de-DE',
        audioDurationMs: data.audioDurationMs,
        transcriptionDurationMs: data.durationMs
      };
    } catch (error: any) {
      console.error('[Transcription] Server error:', error);
      throw new Error(`Transkription fehlgeschlagen: ${error.message || error}`);
    }
  }

  async checkStatus(): Promise<{ available: boolean; providers: Record<string, boolean> }> {
    try {
      const response: any = await lastValueFrom(
        this.http.get(`${this.apiUrl}/transcribe/status`)
      );

      const providers = response?.data?.providers || response?.providers || {};
      const available = Object.values(providers).includes(true);

      return { available, providers };
    } catch (error) {
      console.warn('[Transcription] Status check failed:', error);
      return { available: false, providers: {} };
    }
  }
}

