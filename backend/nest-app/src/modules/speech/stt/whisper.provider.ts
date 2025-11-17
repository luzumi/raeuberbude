import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { STTProvider, TranscriptionResult } from './stt.provider';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class WhisperProvider implements STTProvider {
  readonly name = 'whisper';
  private readonly logger = new Logger(WhisperProvider.name);
  private whisperUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    const baseUrl = this.configService.get<string>('WHISPER_URL', 'http://localhost:9090/transcribe');
    // Remove /transcribe if it's already in the URL to avoid duplication
    this.whisperUrl = baseUrl.replace(/\/transcribe\/?$/, '');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        // The container does not expose a dedicated health endpoint; /docs returns 200 on FastAPI
        this.httpService.get(`${this.whisperUrl}/docs`, {
          timeout: 2000,
        })
      );
      return response.status === 200;
    } catch (error) {
      this.logger.debug(`Whisper health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Transcribe audio using Whisper
   * @param audioBuffer The audio buffer to transcribe
   * @param mimeType The MIME type of the audio buffer
   * @param language The language code to use for transcription (optional)
   * @returns A promise that resolves to a TranscriptionResult object
   */
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language?: string,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      // Create form data for multipart upload
      const formData = new FormData();

      // Determine file extension based on mime type
      let extension = 'wav';
      if (mimeType.includes('webm')) extension = 'webm';
      else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) extension = 'mp3';
      else if (mimeType.includes('ogg')) extension = 'ogg';
      else if (mimeType.includes('wav')) extension = 'wav';

      // Add audio file to form data (whisper-asr expects 'audio_file')
      this.addAudioFileFromFormData( formData, audioBuffer, extension, mimeType, language );

      // Optional: Initial prompt to bias recognition (configurable via WHISPER_INITIAL_PROMPT)
      const initialPrompt = this.configService.get<string>('WHISPER_INITIAL_PROMPT');
      if (initialPrompt) {
        formData.append('initial_prompt', initialPrompt);
      }

      // Send request to Whisper server
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.whisperUrl}/asr`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 30000, // 30 second timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          },
        )
      );

      const result = response.data;
      let transcript = '';
      let confidence = 0.95;

      // 1) plain string
      if (typeof result === 'string') {
        transcript = result;
      }
      // 2) standard { text }
      else if (result && typeof result.text === 'string' && result.text.trim()) {
        transcript = result.text;
        if (typeof result.confidence === 'number') confidence = result.confidence;
      }
      // 3) segments array with { text }
      else if (result && Array.isArray(result.segments) && result.segments.length > 0) {
        transcript = result.segments.map((s: any) => s?.text || s?.transcript || '').join(' ').trim();
        if (typeof result.confidence === 'number') confidence = result.confidence;
      }
      // 4) alternative field names often used by wrappers
      else if (result && typeof result.transcription === 'string' && result.transcription.trim()) {
        transcript = result.transcription;
      }
      // 5) { result: [...words or segments...] }
      else if (result && Array.isArray(result.result) && result.result.length > 0) {
        transcript = result.result.map((r: any) => r?.text || r?.word || '').join(' ').trim();
      }
      // 6) nested data containers: { data: { text: ... } } or { prediction: ... } or { pred_text: ... }
      else if (result && typeof result.data === 'object') {
        const d = result.data;
        if (typeof d.text === 'string' && d.text.trim()) transcript = d.text;
        else if (typeof d.transcription === 'string' && d.transcription.trim()) transcript = d.transcription;
        else if (typeof d.prediction === 'string' && d.prediction.trim()) transcript = d.prediction;
        else if (typeof d.pred_text === 'string' && d.pred_text.trim()) transcript = d.pred_text;
      }
      // 7) array of segments [{ text }]
      else if (Array.isArray(result) && result.length > 0) {
        transcript = result.map((segment: any) => segment?.text || segment?.transcript || '').join(' ').trim();
        if (result[0] && typeof result[0].confidence === 'number') {
          const sum = result.reduce((acc: number, s: any) => acc + (s.confidence || 0), 0);
          confidence = sum / result.length;
        }
      }

      // Graceful final fallback: try to stringify and regex minimal text
      if (!transcript && result && typeof result === 'object') {
        try {
          const json = JSON.stringify(result);
          const m = json.match(/"text"\s*:\s*"([^"]+)"/);
          if (m && m[1]) transcript = m[1];
        } catch { /* ignore */ }
      }

      if (!transcript || !transcript.trim()) {
        throw new Error('No transcript in Whisper response');
      }

      return {
        provider: this.name,
        transcript: transcript.trim(),
        confidence,
        durationMs: Date.now() - startTime,
        language: language || (result?.language ? String(result.language) : 'de-DE'),
      };

    } catch (error) {
      this.logger.error(`Whisper transcription failed: ${error.message}`);
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  private addAudioFileFromFormData(formData: FormData, audioBuffer: Buffer<ArrayBufferLike>, extension: string, mimeType: string, language: string): void {
    formData.append( 'audio_file', audioBuffer, {
      filename: `audio.${ extension }`,
      contentType: mimeType,
    } );

    const whisperLang = this.mapLanguageCode( language || 'de-DE' );
    formData.append( 'language', whisperLang );

    // Optional: Add task type (transcribe vs translate)
    formData.append( 'task', 'transcribe' );

    // Optional: Add output format
    formData.append( 'output', 'json' );

    // Hint to server to encode if needed (helps with some formats)
    formData.append( 'encode', 'true' );
  }

  private mapLanguageCode(language: string): string {
    // Map common language codes to Whisper format
    const languageMap: { [key: string]: string } = {
      'de-DE': 'de',
      'de-AT': 'de',
      'de-CH': 'de',
      'en-US': 'en',
      'en-GB': 'en',
      'en': 'en',
      'de': 'de',
    };

    return languageMap[language] || language.split('-')[0] || 'de';
  }
}
