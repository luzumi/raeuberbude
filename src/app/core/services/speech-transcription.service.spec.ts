/**
 * Unit-Tests für SpeechTranscriptionService
 * Testet Server-basierte Transkription (HTTP-Kommunikation)
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SpeechTranscriptionService } from './speech-transcription.service';
import {
  mockTranscribeResponse,
  mockTranscribeError,
  mockStatusResponse,
  HttpMockScenarios
} from '../../../testing/http-mocks';
import { createFakeAudioBlob } from '../../../testing/test-helpers';
import { flushTerminalRegisterIfAny } from '../../../testing/test-helpers';

describe('SpeechTranscriptionService', () => {
  let service: SpeechTranscriptionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SpeechTranscriptionService]
    });

    service = TestBed.inject(SpeechTranscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
    // Ensure any automatic terminal registration performed by services is flushed
    flushTerminalRegisterIfAny(httpMock);
  });

  afterEach(() => {
    httpMock.verify(); // Keine offenen HTTP-Requests
  });

  describe('Basic Transcription', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should transcribe audio successfully', async () => {
      const audioBlob = createFakeAudioBlob(50, 'audio/webm');
      const expectedResponse = mockTranscribeResponse({
        transcript: 'Schalte das Licht ein',
        confidence: 0.95,
        provider: 'vosk',
        language: 'de-DE'
      });

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE',
        maxDurationMs: 30000
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush(expectedResponse);

      const result = await transcribePromise;
      expect(result.transcript).toBe('Schalte das Licht ein');
      expect(result.confidence).toBe(0.95);
      expect(result.provider).toBe('vosk');
      expect(result.language).toBe('de-DE');
    });

    it('should send FormData with audio blob and parameters', async () => {
      const audioBlob = createFakeAudioBlob(50, 'audio/webm');

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'en-US',
        maxDurationMs: 15000
      });

      const req = httpMock.expectOne('/api/speech/transcribe');

      const formData = req.request.body as FormData;
      expect(formData.has('audio')).toBe(true);
      expect(formData.get('language')).toBe('en-US');
      expect(formData.get('maxDurationMs')).toBe('15000');

      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.9 }));
      await transcribePromise;
    });

    it('should use default language if not provided', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      const formData = req.request.body as FormData;
      expect(formData.get('language')).toBe('de-DE');

      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.9 }));
      await transcribePromise;
    });

    it('should include withCredentials', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.9 }));
      await transcribePromise;
    });
  });

  describe('Error Handling', () => {
    it('should handle server error response', async () => {
      const audioBlob = createFakeAudioBlob();
      const errorResponse = mockTranscribeError({
        error: 'AUDIO_TOO_SHORT',
        message: 'Audio file is too short'
      });

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(errorResponse);

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Transkription fehlgeschlagen');
        expect(error.message).toContain('AUDIO_TOO_SHORT');
      }
    });

    it('should handle HTTP network error', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network error' });

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle 500 server error', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle timeout', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeError({ error: 'TIMEOUT', message: 'Request timeout' }));

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('TIMEOUT');
      }
    });

    it('should handle response without success flag', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush({ success: false, error: 'UNKNOWN_ERROR' });

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('UNKNOWN_ERROR');
      }
    });

    it('should handle malformed response', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush({ success: true }); // Fehlendes data-Feld

      try {
        await transcribePromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Transcription failed');
      }
    });
  });

  describe('Check Status', () => {
    it('should check transcription status successfully', async () => {
      const expectedResponse = mockStatusResponse({
        vosk: true,
        whisper: false,
        google: false
      });

      const statusPromise = service.checkStatus();

      const req = httpMock.expectOne('/api/speech/transcribe/status');
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);

      const result = await statusPromise;
      expect(result.available).toBe(true);
      expect(result.providers['vosk']).toBe(true);
      expect(result.providers['whisper']).toBe(false);
    });

    it('should return unavailable if all providers are down', async () => {
      const expectedResponse = mockStatusResponse({
        vosk: false,
        whisper: false,
        google: false
      });

      const statusPromise = service.checkStatus();

      const req = httpMock.expectOne('/api/speech/transcribe/status');
      req.flush(expectedResponse);

      const result = await statusPromise;
      expect(result.available).toBe(false);
    });

    it('should handle status check error gracefully', async () => {
      const statusPromise = service.checkStatus();

      const req = httpMock.expectOne('/api/speech/transcribe/status');
      req.error(new ProgressEvent('error'));

      const result = await statusPromise;
      expect(result.available).toBe(false);
      expect(result.providers).toEqual({});
    });

    it('should parse providers from response.data', async () => {
      const statusPromise = service.checkStatus();

      const req = httpMock.expectOne('/api/speech/transcribe/status');
      req.flush({
        success: true,
        data: {
          providers: {
            vosk: true,
            whisper: true
          }
        }
      });

      const result = await statusPromise;
      expect(result.available).toBe(true);
      expect(result.providers['vosk']).toBe(true);
      expect(result.providers['whisper']).toBe(true);
    });

    it('should parse providers from response root', async () => {
      const statusPromise = service.checkStatus();

      const req = httpMock.expectOne('/api/speech/transcribe/status');
      req.flush({
        providers: {
          vosk: true
        }
      });

      const result = await statusPromise;
      expect(result.available).toBe(true);
      expect(result.providers['vosk']).toBe(true);
    });
  });

  describe('Different Audio Formats', () => {
    it('should handle webm format', async () => {
      const audioBlob = createFakeAudioBlob(50, 'audio/webm;codecs=opus');

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm;codecs=opus',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.95 }));

      const result = await transcribePromise;
      expect(result).toBeDefined();
    });

    it('should handle ogg format', async () => {
      const audioBlob = createFakeAudioBlob(50, 'audio/ogg;codecs=opus');

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/ogg;codecs=opus',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.95 }));

      const result = await transcribePromise;
      expect(result).toBeDefined();
    });

    it('should handle mp4 format', async () => {
      const audioBlob = createFakeAudioBlob(50, 'audio/mp4');

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/mp4',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.95 }));

      const result = await transcribePromise;
      expect(result).toBeDefined();
    });
  });

  describe('Different Languages', () => {
    it('should transcribe German audio', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      const formData = req.request.body as FormData;
      expect(formData.get('language')).toBe('de-DE');

      req.flush(mockTranscribeResponse({
        transcript: 'Guten Tag',
        confidence: 0.95,
        language: 'de-DE'
      }));

      const result = await transcribePromise;
      expect(result.language).toBe('de-DE');
    });

    it('should transcribe English audio', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'en-US'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      const formData = req.request.body as FormData;
      expect(formData.get('language')).toBe('en-US');

      req.flush(mockTranscribeResponse({
        transcript: 'Hello',
        confidence: 0.95,
        language: 'en-US'
      }));

      const result = await transcribePromise;
      expect(result.language).toBe('en-US');
    });
  });

  describe('Performance Metrics', () => {
    it('should return audioDurationMs', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeResponse({
        transcript: 'Test',
        confidence: 0.95,
        audioDurationMs: 3500
      }));

      const result = await transcribePromise;
      expect(result.audioDurationMs).toBe(3500);
    });

    it('should return transcriptionDurationMs', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(mockTranscribeResponse({
        transcript: 'Test',
        confidence: 0.95,
        durationMs: 250
      }));

      const result = await transcribePromise;
      expect(result.transcriptionDurationMs).toBe(250);
    });
  });

  describe('Confidence Levels', () => {
    it('should return high confidence transcription', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(HttpMockScenarios.successHighConfidence());

      const result = await transcribePromise;
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should return low confidence transcription', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(HttpMockScenarios.successLowConfidence());

      const result = await transcribePromise;
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle empty transcript', async () => {
      const audioBlob = createFakeAudioBlob();

      const transcribePromise = service.transcribe({
        audioBlob,
        mimeType: 'audio/webm',
        language: 'de-DE'
      });

      const req = httpMock.expectOne('/api/speech/transcribe');
      req.flush(HttpMockScenarios.successEmpty());

      const result = await transcribePromise;
      expect(result.transcript).toBe('');
      expect(result.confidence).toBe(0);
    });
  });
});
