/**
 * Unit-Tests für SpeechService
 * Testet Haupt-Orchestrierung der Spracheingabe
 */

import { TestBed } from '@angular/core/testing';
import { SpeechService } from './speech.service';
import { SpeechRecorderService, RecordingResult } from './speech-recorder.service';
import { SpeechTranscriptionService, TranscriptionResult } from './speech-transcription.service';
import { TranscriptionValidatorService } from './transcription-validator.service';
import { IntentActionService } from './intent-action.service';
import { SpeechPersistenceService } from './speech-persistence.service';
import { TerminalService } from './terminal.service';
import { BehaviorSubject } from 'rxjs';

describe('SpeechService', () => {
  let service: SpeechService;
  let mockRecorder: any;
  let mockTranscription: any;
  let mockValidator: any;
  let mockIntentAction: any;
  let mockPersistence: any;
  let mockTerminal: any;
  let isRecordingSubject: BehaviorSubject<boolean>;

  const fakeRecordingResult: RecordingResult = {
    audioBlob: new Blob(['test'], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    durationMs: 2000
  };

  const fakeTranscriptionResult: TranscriptionResult = {
    transcript: 'Test Eingabe',
    confidence: 0.95,
    provider: 'vosk',
    language: 'de-DE',
    audioDurationMs: 2000,
    transcriptionDurationMs: 500
  };

  beforeEach(() => {
    try {
      spyOn(localStorage, 'getItem').and.returnValue(null);
    } catch (e) {
      (localStorage as any).getItem = jasmine.createSpy('getItem').and.returnValue(null) as any;
    }
    try {
      spyOn(localStorage, 'setItem');
    } catch (e) {
      (localStorage as any).setItem = jasmine.createSpy('setItem') as any;
    }

    isRecordingSubject = new BehaviorSubject<boolean>(false);

    mockRecorder = {
      isRecording$: isRecordingSubject.asObservable(),
      startRecording: jasmine.createSpy('startRecording').and.returnValue(Promise.resolve()),
      stopRecording: jasmine.createSpy('stopRecording').and.returnValue(Promise.resolve(fakeRecordingResult))
    };

    mockTranscription = {
      transcribe: jasmine.createSpy('transcribe').and.returnValue(Promise.resolve(fakeTranscriptionResult))
    };

    mockValidator = {
      validate: jasmine.createSpy('validate').and.returnValue(Promise.resolve({
        isValid: true,
        confidence: 0.95,
        clarificationNeeded: false,
        issues: [],
        intent: null
      }))
    };

    mockIntentAction = {
      executeIntent: jasmine.createSpy('executeIntent').and.returnValue(Promise.resolve({ success: true })),
      handleIntent: jasmine.createSpy('handleIntent').and.returnValue(Promise.resolve({ success: true, showDialog: false })),
      emitResult: jasmine.createSpy('emitResult'),
      showLoadingDialog: jasmine.createSpy('showLoadingDialog')
    };

    mockPersistence = {
      setUserId: jasmine.createSpy('setUserId'),
      getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
      saveTranscript: jasmine.createSpy('saveTranscript').and.returnValue(Promise.resolve())
    };

    mockTerminal = {
      getMyTerminal: jasmine.createSpy('getMyTerminal').and.returnValue(Promise.resolve({ success: true, data: { terminalId: 'test-terminal' } }))
    };

    TestBed.configureTestingModule({
      providers: [
        SpeechService,
        { provide: SpeechRecorderService, useValue: mockRecorder },
        { provide: SpeechTranscriptionService, useValue: mockTranscription },
        { provide: TranscriptionValidatorService, useValue: mockValidator },
        { provide: IntentActionService, useValue: mockIntentAction },
        { provide: SpeechPersistenceService, useValue: mockPersistence },
        { provide: TerminalService, useValue: mockTerminal }
      ]
    });

    service = TestBed.inject(SpeechService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have observables', () => {
      expect(service.isRecording$).toBeDefined();
      expect(service.lastInput$).toBeDefined();
      expect(service.transcript$).toBeDefined();
      expect(service.validationResult$).toBeDefined();
    });

    it('should initialize with validation enabled', () => {
      expect(service.isValidationEnabled()).toBe(true);
    });

    it('should load validation preference from localStorage', () => {
      expect(localStorage.getItem).toHaveBeenCalledWith('speech-validation-enabled');
    });
  });

  describe('Recording Flow', () => {
    it('should start recording via recorder service', async () => {
      await service.startRecording();
      expect(mockRecorder.startRecording).toHaveBeenCalledWith({
        maxDurationMs: 30000,
        language: 'de-DE'
      });
    });

    it('should sync isRecording$ from recorder', () => {
      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);

      isRecordingSubject.next(true);
      expect(isRecording).toBe(true);

      isRecordingSubject.next(false);
      expect(isRecording).toBe(false);
    });

    it('should not start if already recording', async () => {
      isRecordingSubject.next(true);
      await service.startRecording();
      expect(mockRecorder.startRecording).not.toHaveBeenCalled();
    });

    it('should handle start recording error', async () => {
      mockRecorder.startRecording.and.returnValue(Promise.reject(new Error('No mic')));
      await expectAsync(service.startRecording()).toBeRejectedWithError('No mic');
    });

    it('should stop recording and process result', async () => {
      isRecordingSubject.next(true);
      await service.stopRecording();
      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(mockTranscription.transcribe).toHaveBeenCalled();
    });

    it('should not stop if not recording', async () => {
      await service.stopRecording();
      expect(mockRecorder.stopRecording).not.toHaveBeenCalled();
    });
  });

  describe('Transcription', () => {
    it('should emit transcript$ on successful transcription', async () => {
      const transcripts: any[] = [];
      service.transcript$.subscribe(t => transcripts.push(t));

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(transcripts.length).toBeGreaterThan(0);
      expect(transcripts[0].transcript).toBe('Test Eingabe');
      expect(transcripts[0].confidence).toBe(0.95);
      expect(transcripts[0].isFinal).toBe(true);
    });

    it('should handle transcription error', async () => {
      mockTranscription.transcribe.and.returnValue(Promise.reject(new Error('STT failed')));

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockIntentAction.emitResult).toHaveBeenCalledWith(jasmine.objectContaining({
        success: false
      }));
    });
  });

  describe('Validation Integration', () => {
    it('should validate transcription when enabled', async () => {
      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('should skip validation when disabled', async () => {
      service.setValidationEnabled(false);

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockValidator.validate).not.toHaveBeenCalled();
    });

    it('should emit validationResult$ after validation', async () => {
      const results: any[] = [];
      service.validationResult$.subscribe(r => results.push(r));

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle clarification needed', async () => {
      mockValidator.validate.and.returnValue(Promise.resolve({
        isValid: false,
        confidence: 0.75,
        clarificationNeeded: true,
        clarificationQuestion: 'Welches Licht?',
        issues: [],
        intent: null
      }));

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(service.isAwaitingClarification()).toBe(true);
      expect(mockIntentAction.emitResult).toHaveBeenCalledWith(jasmine.objectContaining({
        success: false,
        message: 'Welches Licht?'
      }));
    });
  });

  describe('Intent Processing', () => {
    it('should process intent when validation returns one', async () => {
      mockValidator.validate.and.returnValue(Promise.resolve({
        isValid: true,
        clarificationNeeded: false,
        issues: [],
        intent: { intent: 'light.on', entities: {} }
      }));

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockIntentAction.handleIntent).toHaveBeenCalledWith(
        jasmine.objectContaining({ intent: 'light.on' })
      );
    });
  });

  describe('Persistence', () => {
    it('should save transcript after processing', async () => {
      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockPersistence.saveTranscript).toHaveBeenCalled();
    });

    it('should save without validation when disabled', async () => {
      service.setValidationEnabled(false);

      isRecordingSubject.next(true);
      await service.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockPersistence.saveTranscript).toHaveBeenCalled();
      expect(service.isValidationEnabled()).toBe(false);
    });
  });

  describe('Settings', () => {
    it('should toggle validation', () => {
      expect(service.isValidationEnabled()).toBe(true);
      service.setValidationEnabled(false);
      expect(service.isValidationEnabled()).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('speech-validation-enabled', 'false');
    });
  });

  describe('Clarification Management', () => {
    it('should clear clarification', () => {
      service.clearClarification();
      expect(service.isAwaitingClarification()).toBe(false);
    });

    it('should return last validation result', () => {
      expect(service.getLastValidationResult()).toBeNull();
    });
  });

  describe('User Management', () => {
    it('should set current user ID', () => {
      service.setCurrentUserId('user-123');
      expect(mockPersistence.setUserId).toHaveBeenCalledWith('user-123');
    });

    it('should initialize after login', async () => {
      await service.initializeAfterLogin('user-456');
      expect(mockPersistence.setUserId).toHaveBeenCalledWith('user-456');
    });
  });

  describe('Abort Operation', () => {
    it('should abort and reset state', () => {
      service.abortCurrentOperation();

      let isRecording = false;
      service.isRecording$.subscribe(val => isRecording = val);
      expect(isRecording).toBe(false);
      expect(service.isAwaitingClarification()).toBe(false);

      expect(mockIntentAction.emitResult).toHaveBeenCalledWith(jasmine.objectContaining({
        success: false,
        message: 'Abgebrochen'
      }));
    });
  });
});
