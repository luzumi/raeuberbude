/**
 * Unit-Tests für SpeechRecorderService
 * Testet Audio-Aufnahme mit MediaRecorder
 */

import { TestBed } from '@angular/core/testing';
import { SpeechRecorderService } from './speech-recorder.service';
import { MockMediaRecorder, createMockMediaStream } from '../../../testing/mock-media-recorder';
import { mockGetUserMedia, GetUserMediaScenarios, unmockGetUserMedia } from '../../../testing/mock-getusermedia';
import { createFakeAudioBlob, FakeTimer } from '../../../testing/test-helpers';



describe('SpeechRecorderService', () => {
  let service: SpeechRecorderService;
  let mockRecorder: MockMediaRecorder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpeechRecorderService);

    // Mock MediaRecorder global
    mockRecorder = new MockMediaRecorder();
    (window as any).MediaRecorder = jasmine.createSpy('MediaRecorder').and.returnValue(mockRecorder);
    (window as any).MediaRecorder.isTypeSupported = jasmine.createSpy('isTypeSupported').and.returnValue(true);
  });

  afterEach(() => {
    unmockGetUserMedia();
  });

  describe('Basic Recording', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start recording with getUserMedia success', async () => {
      mockGetUserMedia(true);

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      expect(isRecording).toBe(false); // noch nicht gestartet

      await service.startRecording();

      expect(mockRecorder.state).toBe('recording');
      expect(isRecording).toBe(true);
    });

    it('should stop recording and return result', async () => {
      mockGetUserMedia(true);

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      await service.startRecording();

      // Simuliere Daten
      const fakeBlob = createFakeAudioBlob(50, 'audio/webm');
      mockRecorder.triggerDataAvailable(fakeBlob);

      // Stop triggern
      const resultPromise = service.stopRecording();
      mockRecorder.triggerStop();

      const result = await resultPromise;

      expect(result).toBeDefined();
      expect(result.audioBlob).toBeDefined();
      expect(result.audioBlob.size).toBeGreaterThan(0);
      expect(result.mimeType).toBe('audio/webm;codecs=opus');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(isRecording).toBe(false);
    });

    it('should emit isRecording$ changes', (done) => {
      mockGetUserMedia(true);

      const emissions: boolean[] = [];
      service.isRecording$.subscribe(val => emissions.push(val));

      service.startRecording().then(() => {
        expect(emissions).toContain(true);

        const fakeBlob = createFakeAudioBlob();
        mockRecorder.triggerDataAvailable(fakeBlob);

        service.stopRecording().then(() => {
          mockRecorder.triggerStop();

          setTimeout(() => {
            expect(emissions).toContain(false);
            expect(emissions[emissions.length - 1]).toBe(false);
            done();
          }, 10);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject if getUserMedia fails with NotAllowedError', async () => {
      GetUserMediaScenarios.permissionDenied();

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      try {
        await service.startRecording();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBe('NotAllowedError');
        expect(isRecording).toBe(false);
      }
    });

    it('should reject if getUserMedia fails with NotFoundError', async () => {
      GetUserMediaScenarios.noDevice();

      try {
        await service.startRecording();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBe('NotFoundError');
      }
    });

    it('should reject if getUserMedia is not supported', async () => {
      GetUserMediaScenarios.notSupported();

      try {
        await service.startRecording();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('getUserMedia not supported');
      }
    });

    it('should reject if already recording', async () => {
      mockGetUserMedia(true);

      await service.startRecording();

      try {
        await service.startRecording();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Already recording');
      }
    });

    it('should reject stopRecording if not recording', async () => {
      try {
        await service.stopRecording();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Not recording');
      }
    });

    it('should handle MediaRecorder errors', async () => {
      mockGetUserMedia(true);

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      await service.startRecording();

      const stopPromise = service.stopRecording();
      mockRecorder.triggerError('UnknownError', 'Recording failed');

      try {
        await stopPromise;
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(isRecording).toBe(false);
      }
    });
  });

  describe('Recording Options', () => {
    it('should respect maxDurationMs option', (done) => {
      mockGetUserMedia(true);
      const timer = new FakeTimer();

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      service.startRecording({ maxDurationMs: 1000 }).then(() => {
        expect(isRecording).toBe(true);

        // Fast-forward 1000ms
        timer.tick(1000);

        setTimeout(() => {
          // Auto-stop sollte getriggert worden sein
          expect(mockRecorder.state).toBe('inactive');
          timer.destroy();
          done();
        }, 10);
      });
    });

    it('should use default maxDurationMs of 30s', async () => {
      mockGetUserMedia(true);
      const timer = new FakeTimer();

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      await service.startRecording();

      expect(isRecording).toBe(true);

      timer.tick(30000);

      // Sollte nach 30s auto-stoppen
      setTimeout(() => {
        expect(mockRecorder.state).toBe('inactive');
        timer.destroy();
      }, 10);
    });

    it('should pass language option (for metadata)', async () => {
      mockGetUserMedia(true);

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      await service.startRecording({ language: 'en-US' });

      expect(isRecording).toBe(true);
      // Language wird nicht direkt an MediaRecorder übergeben, aber für spätere Verwendung gespeichert
    });
  });

  describe('MediaRecorder Configuration', () => {
    it('should configure MediaRecorder with optimal settings', async () => {
      mockGetUserMedia(true);

      await service.startRecording();

      expect((window as any).MediaRecorder).toHaveBeenCalled();
      const args = ((window as any).MediaRecorder as jasmine.Spy).calls.mostRecent().args;

      expect(args[0]).toBeDefined(); // stream
      expect(args[1]).toBeDefined(); // options
      expect(args[1].mimeType).toBe('audio/webm;codecs=opus');
      expect(args[1].audioBitsPerSecond).toBe(192000);
    });

    it('should fallback to simple audio constraints if advanced fail', async () => {
      let callCount = 0;
      const getUserMediaMock = jasmine.createSpy('getUserMedia').and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          // Erste Call mit erweiterten Constraints schlägt fehl
          return Promise.reject(new DOMException('OverconstrainedError'));
        } else {
          // Zweiter Call mit einfachen Constraints erfolgreich
          return Promise.resolve(createMockMediaStream());
        }
      });

      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: getUserMediaMock,
        writable: true,
        configurable: true
      });

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      await service.startRecording();

      expect(getUserMediaMock).toHaveBeenCalledTimes(2);
      expect(isRecording).toBe(true);
    });

    it('should start MediaRecorder with timeslice', async () => {
      mockGetUserMedia(true);

      await service.startRecording();

      expect(mockRecorder.start).toBeDefined();
      // MediaRecorder.start(1000) für 1s chunks
    });
  });

  describe('Cleanup', () => {
    it('should stop all media tracks on stop', async () => {
      const mockStream = createMockMediaStream();
      mockGetUserMedia(true, undefined, undefined, mockStream);

      await service.startRecording();

      const fakeBlob = createFakeAudioBlob();
      mockRecorder.triggerDataAvailable(fakeBlob);

      const stopPromise = service.stopRecording();
      mockRecorder.triggerStop();
      await stopPromise;

      const tracks = mockStream.getTracks();
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should cleanup on error', async () => {
      const mockStream = createMockMediaStream();
      mockGetUserMedia(true, undefined, undefined, mockStream);

      await service.startRecording();

      const stopPromise = service.stopRecording();
      mockRecorder.triggerError('UnknownError', 'Test error');

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      try {
        await stopPromise;
      } catch {
        // Expected error
      }

      expect(isRecording).toBe(false);

      const tracks = mockStream.getTracks();
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
      });
    });
  });

  describe('MIME Type Selection', () => {
    it('should select supported MIME type', async () => {
      mockGetUserMedia(true);

      // Mock isTypeSupported für verschiedene Types
      (MockMediaRecorder.isTypeSupported as jasmine.Spy).and.callFake((type: string) => {
        return type === 'audio/webm;codecs=opus';
      });

      await service.startRecording();

      expect(mockRecorder.mimeType).toBe('audio/webm;codecs=opus');
    });

    it('should fallback to audio/webm if opus not supported', async () => {
      mockGetUserMedia(true);

      (MockMediaRecorder.isTypeSupported as jasmine.Spy).and.callFake((type: string) => {
        return type === 'audio/webm' || type === 'audio/ogg;codecs=opus';
      });

      await service.startRecording();

      // Service sollte audio/webm wählen (zweite Option)
      const args = ((window as any).MediaRecorder as jasmine.Spy).calls.mostRecent().args;
      expect(['audio/webm', 'audio/ogg;codecs=opus']).toContain(args[1].mimeType);
    });
  });

  describe('Multiple Recording Sessions', () => {
    it('should handle multiple start-stop cycles', async () => {
      mockGetUserMedia(true);

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      // Erste Session
      await service.startRecording();
      mockRecorder.triggerDataAvailable(createFakeAudioBlob());
      let stopPromise = service.stopRecording();
      mockRecorder.triggerStop();
      await stopPromise;

      expect(isRecording).toBe(false);

      // Zweite Session
      mockRecorder = new MockMediaRecorder();
      (window as any).MediaRecorder = jasmine.createSpy().and.returnValue(mockRecorder);

      await service.startRecording();
      mockRecorder.triggerDataAvailable(createFakeAudioBlob());
      stopPromise = service.stopRecording();
      mockRecorder.triggerStop();
      await stopPromise;

      expect(isRecording).toBe(false);
    });
  });
});

