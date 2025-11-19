/**
 * Unit-Tests für SpeechValidationDemoComponent
 * Testet Demo-UI für Sprachvalidierung
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SpeechValidationDemoComponent } from './speech-validation-demo.component';
import { SpeechService } from '../../core/services/speech.service';
import { TtsService } from '../../core/services/tts.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { createFakeValidationResult, createFakeSpeechRecognitionResult } from '../../../testing/test-helpers';

describe('SpeechValidationDemoComponent', () => {
  let component: SpeechValidationDemoComponent;
  let fixture: ComponentFixture<SpeechValidationDemoComponent>;
  let mockSpeechService: any;
  let mockTtsService: any;
  let isRecordingSubject: BehaviorSubject<boolean>;
  let lastInputSubject: BehaviorSubject<string>;
  let transcriptSubject: Subject<any>;
  let validationResultSubject: Subject<any>;
  let isSpeakingSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    isRecordingSubject = new BehaviorSubject<boolean>(false);
    lastInputSubject = new BehaviorSubject<string>('');
    transcriptSubject = new Subject();
    validationResultSubject = new Subject();
    isSpeakingSubject = new BehaviorSubject<boolean>(false);

    mockSpeechService = {
      isRecording$: isRecordingSubject.asObservable(),
      lastInput$: lastInputSubject.asObservable(),
      transcript$: transcriptSubject.asObservable(),
      validationResult$: validationResultSubject.asObservable(),

      startRecording: jasmine.createSpy('startRecording').and.returnValue(Promise.resolve()),
      stopRecording: jasmine.createSpy('stopRecording').and.returnValue(Promise.resolve()),
      speak: jasmine.createSpy('speak').and.returnValue(Promise.resolve()),
      cancelSpeech: jasmine.createSpy('cancelSpeech'),
      clearClarification: jasmine.createSpy('clearClarification'),

      setValidationEnabled: jasmine.createSpy('setValidationEnabled'),
      setTTSEnabled: jasmine.createSpy('setTTSEnabled'),
      setSTTMode: jasmine.createSpy('setSTTMode'),

      isValidationEnabled: jasmine.createSpy('isValidationEnabled').and.returnValue(true),
      isTTSEnabled: jasmine.createSpy('isTTSEnabled').and.returnValue(true),
      getSTTMode: jasmine.createSpy('getSTTMode').and.returnValue('auto'),
      isAwaitingClarification: jasmine.createSpy('isAwaitingClarification').and.returnValue(false)
    };

    mockTtsService = {
      isSpeaking$: isSpeakingSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [SpeechValidationDemoComponent, FormsModule],
      providers: [
        { provide: SpeechService, useValue: mockSpeechService },
        { provide: TtsService, useValue: mockTtsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpeechValidationDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load initial settings from service', () => {
      expect(component.validationEnabled).toBe(true);
      expect(component.ttsEnabled).toBe(true);
      expect(component.sttMode).toBe('auto');
    });

    it('should subscribe to all observables', () => {
      expect(mockSpeechService.isRecording$).toBeDefined();
      expect(mockSpeechService.lastInput$).toBeDefined();
      expect(mockSpeechService.transcript$).toBeDefined();
      expect(mockSpeechService.validationResult$).toBeDefined();
      expect(mockTtsService.isSpeaking$).toBeDefined();
    });
  });

  describe('Status Display', () => {
    it('should display recording status', () => {
      isRecordingSubject.next(true);
      fixture.detectChanges();

      const statusValue = fixture.nativeElement.querySelector('.status-item:first-child .value');
      expect(statusValue.textContent).toContain('🔴 Aktiv');
      expect(component.isRecording).toBe(true);
    });

    it('should display ready status when not recording', () => {
      isRecordingSubject.next(false);
      fixture.detectChanges();

      const statusValue = fixture.nativeElement.querySelector('.status-item:first-child .value');
      expect(statusValue.textContent).toContain('⚪ Bereit');
      expect(component.isRecording).toBe(false);
    });

    it('should display TTS speaking status', () => {
      isSpeakingSubject.next(true);
      fixture.detectChanges();

      const statusValue = fixture.nativeElement.querySelectorAll('.status-item')[1].querySelector('.value');
      expect(statusValue.textContent).toContain('🔊 Spricht');
      expect(component.isSpeaking).toBe(true);
    });

    it('should display TTS silent status', () => {
      isSpeakingSubject.next(false);
      fixture.detectChanges();

      const statusValue = fixture.nativeElement.querySelectorAll('.status-item')[1].querySelector('.value');
      expect(statusValue.textContent).toContain('🔇 Still');
      expect(component.isSpeaking).toBe(false);
    });

    it('should display awaiting clarification status', () => {
      mockSpeechService.isAwaitingClarification.and.returnValue(true);

      validationResultSubject.next(createFakeValidationResult({
        clarificationNeeded: true
      }));
      fixture.detectChanges();

      const statusValue = fixture.nativeElement.querySelectorAll('.status-item')[2].querySelector('.value');
      expect(statusValue.textContent).toContain('⚠️ Ja');
      expect(component.awaitingClarification).toBe(true);
    });
  });

  describe('Recording Controls', () => {
    it('should start recording on button click', async () => {
      const startButton = fixture.nativeElement.querySelector('button');
      startButton.click();

      await fixture.whenStable();

      expect(mockSpeechService.startRecording).toHaveBeenCalled();
    });

    it('should stop recording on button click when recording', async () => {
      isRecordingSubject.next(true);
      component.isRecording = true;
      fixture.detectChanges();

      const stopButton = fixture.nativeElement.querySelector('button');
      stopButton.click();

      await fixture.whenStable();

      expect(mockSpeechService.stopRecording).toHaveBeenCalled();
    });

    it('should change button text when recording', () => {
      isRecordingSubject.next(false);
      fixture.detectChanges();

      let button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('🎤 Start Aufnahme');

      isRecordingSubject.next(true);
      fixture.detectChanges();

      button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('⏹️ Stop');
    });

    it('should disable start button when TTS is speaking', () => {
      isSpeakingSubject.next(true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('should add recording class to button when recording', () => {
      isRecordingSubject.next(true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('recording')).toBe(true);
    });
  });

  describe('TTS Controls', () => {
    it('should cancel speech on button click', () => {
      // Stelle sicher dass TTS aktiv ist
      mockTtsService.isSpeaking$.next(true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('🔇 TTS Abbrechen')
      );

      expect(cancelButton).toBeTruthy('Cancel button should be visible');
      (cancelButton as HTMLElement).click();

      expect(mockSpeechService.cancelSpeech).toHaveBeenCalled();
    });

    it('should disable cancel button when not speaking', () => {
      isSpeakingSubject.next(false);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('TTS Abbrechen')
      ) as HTMLButtonElement;

      expect(cancelButton.disabled).toBe(true);
    });

    it('should enable cancel button when speaking', () => {
      isSpeakingSubject.next(true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('TTS Abbrechen')
      ) as HTMLButtonElement;

      expect(cancelButton.disabled).toBe(false);
    });
  });

  describe('Clarification Controls', () => {
    it('should clear clarification on button click', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const clearButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('🗑️ Klarstellung löschen')
      );

      (clearButton as HTMLElement).click();

      expect(mockSpeechService.clearClarification).toHaveBeenCalled();
    });

    it('should reset awaiting clarification state', () => {
      component.awaitingClarification = true;
      component.lastValidation = createFakeValidationResult();

      component.clearClarification();

      expect(component.awaitingClarification).toBe(false);
      expect(component.lastValidation).toBeNull();
    });
  });

  describe('Settings', () => {
    it('should toggle validation enabled', () => {
      component.validationEnabled = false;
      component.onValidationToggle();

      expect(mockSpeechService.setValidationEnabled).toHaveBeenCalledWith(false);
    });

    it('should toggle TTS enabled', () => {
      component.ttsEnabled = false;
      component.onTTSToggle();

      expect(mockSpeechService.setTTSEnabled).toHaveBeenCalledWith(false);
    });

    it('should change STT mode', () => {
      component.sttMode = 'browser';
      component.onSTTModeChange();

      expect(mockSpeechService.setSTTMode).toHaveBeenCalledWith('browser');
    });

    it('should render settings checkboxes', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('.settings input[type="checkbox"]');
      expect(checkboxes.length).toBe(2); // Validation + TTS
    });

    it('should render STT mode dropdown', () => {
      const select = fixture.nativeElement.querySelector('.settings select');
      expect(select).toBeTruthy();

      const options = select.querySelectorAll('option');
      expect(options.length).toBe(3); // auto, browser, server
    });
  });

  describe('Last Input Display', () => {
    it('should display last input', () => {
      lastInputSubject.next('Schalte das Licht ein');
      fixture.detectChanges();

      const lastInputDiv = fixture.nativeElement.querySelector('.last-input');
      expect(lastInputDiv).toBeTruthy();
      expect(lastInputDiv.textContent).toContain('Schalte das Licht ein');
    });

    it('should hide last input when empty', () => {
      lastInputSubject.next('');
      fixture.detectChanges();

      const lastInputDiv = fixture.nativeElement.querySelector('.last-input');
      expect(lastInputDiv).toBeFalsy();
    });

    it('should update component state', () => {
      lastInputSubject.next('Test input');
      expect(component.lastInput).toBe('Test input');
    });
  });

  describe('Validation Result Display', () => {
    it('should display validation result', () => {
      const validation = createFakeValidationResult({
        isValid: true,
        confidence: 0.95
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const resultDiv = fixture.nativeElement.querySelector('.validation-result');
      expect(resultDiv).toBeTruthy();
    });

    it('should show valid status', () => {
      const validation = createFakeValidationResult({
        isValid: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const validSpan = fixture.nativeElement.querySelector('.validation-result .success');
      expect(validSpan).toBeTruthy();
      expect(validSpan.textContent).toContain('✅ Ja');
    });

    it('should show invalid status', () => {
      const validation = createFakeValidationResult({
        isValid: false
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const invalidSpan = fixture.nativeElement.querySelector('.validation-result .error');
      expect(invalidSpan).toBeTruthy();
      expect(invalidSpan.textContent).toContain('❌ Nein');
    });

    it('should display confidence percentage', () => {
      const validation = createFakeValidationResult({
        confidence: 0.856
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const confidenceText = fixture.nativeElement.querySelector('.validation-result').textContent;
      expect(confidenceText).toContain('85.6%');
    });

    it('should show clarification question if present', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Welches Licht?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const questionDiv = fixture.nativeElement.querySelector('.clarification-question');
      expect(questionDiv).toBeTruthy();
      expect(questionDiv.textContent).toContain('Welches Licht?');
    });

    it('should show issues list if present', () => {
      const validation = createFakeValidationResult({
        issues: ['Issue 1', 'Issue 2', 'Issue 3']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const issuesDiv = fixture.nativeElement.querySelector('.issues');
      expect(issuesDiv).toBeTruthy();

      const listItems = issuesDiv.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toContain('Issue 1');
    });

    it('should apply correct confidence CSS class', () => {
      const highConfidence = createFakeValidationResult({ confidence: 0.95 });
      validationResultSubject.next(highConfidence);
      fixture.detectChanges();

      expect(component.getConfidenceClass(0.95)).toBe('confidence-high');
      expect(component.getConfidenceClass(0.75)).toBe('confidence-medium');
      expect(component.getConfidenceClass(0.55)).toBe('confidence-low');
    });
  });

  describe('Transcript History', () => {
    it('should collect transcript emissions', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'First',
        confidence: 0.9,
        isFinal: false
      }));
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Second',
        confidence: 0.95,
        isFinal: true
      }));

      expect(component.transcripts.length).toBe(2);
      expect(component.transcripts[0].transcript).toBe('First');
      expect(component.transcripts[1].transcript).toBe('Second');
    });

    it('should display transcript history', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test transcript',
        confidence: 0.9,
        isFinal: true
      }));
      fixture.detectChanges();

      const historyDiv = fixture.nativeElement.querySelector('.transcript-history');
      expect(historyDiv).toBeTruthy();
      expect(historyDiv.textContent).toContain('Test transcript');
    });

    it('should limit to last 10 transcripts', () => {
      for (let i = 0; i < 15; i++) {
        transcriptSubject.next(createFakeSpeechRecognitionResult({
          transcript: `Transcript ${i}`,
          confidence: 0.9,
          isFinal: true
        }));
      }

      expect(component.transcripts.length).toBe(10);
      expect(component.transcripts[0].transcript).toBe('Transcript 5');
    });

    it('should mark final transcripts', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Final',
        confidence: 0.9,
        isFinal: true
      }));
      fixture.detectChanges();

      const transcriptItem = fixture.nativeElement.querySelector('.transcript-item.final');
      expect(transcriptItem).toBeTruthy();
    });

    it('should display confidence in transcript items', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        confidence: 0.87,
        isFinal: true
      }));
      fixture.detectChanges();

      const confidenceSpan = fixture.nativeElement.querySelector('.transcript-item .confidence');
      expect(confidenceSpan.textContent).toContain('87%');
    });
  });

  describe('TTS Test', () => {
    it('should speak test message', async () => {
      component.testMessage = 'Test message';

      await component.speakTestMessage();

      expect(mockSpeechService.speak).toHaveBeenCalledWith('Test message');
    });

    it('should not speak if message is empty', async () => {
      component.testMessage = '';

      await component.speakTestMessage();

      expect(mockSpeechService.speak).not.toHaveBeenCalled();
    });

    it('should have default test message', () => {
      expect(component.testMessage).toBeTruthy();
      expect(component.testMessage.length).toBeGreaterThan(0);
    });

    it('should trigger speak on Enter key', () => {
      component.testMessage = 'Test';
      const input = fixture.nativeElement.querySelector('.tts-test input');

      spyOn(component, 'speakTestMessage');

      const event = new KeyboardEvent('keyup', { key: 'Enter' });
      input.dispatchEvent(event);

      fixture.detectChanges();

      // Verify that the method was called
      expect(component.speakTestMessage).toHaveBeenCalled();
    });

    it('should disable speak button when speaking', () => {
      isSpeakingSubject.next(true);
      fixture.detectChanges();

      const speakButton = fixture.nativeElement.querySelector('.tts-test button');
      expect(speakButton.disabled).toBe(true);
    });

    it('should disable speak button when message is empty', () => {
      component.testMessage = '';
      fixture.detectChanges();

      const speakButton = fixture.nativeElement.querySelector('.tts-test button');
      expect(speakButton.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle recording start failure', async () => {
      mockSpeechService.startRecording.and.returnValue(Promise.reject(new Error('Permission denied')));

      spyOn(console, 'error');

      await component.toggleRecording();

      expect(console.error).toHaveBeenCalledWith('Failed to start recording:', jasmine.any(Error));
    });

    it('should handle TTS failure', async () => {
      mockSpeechService.speak.and.returnValue(Promise.reject(new Error('TTS error')));
      component.testMessage = 'Test';

      spyOn(console, 'error');

      await component.speakTestMessage();

      expect(console.error).toHaveBeenCalledWith('Failed to speak test message:', jasmine.any(Error));
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Responsive Layout', () => {
    it('should render all major sections', () => {
      expect(fixture.nativeElement.querySelector('.status-panel')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.controls')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.settings')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.tts-test')).toBeTruthy();
    });

    it('should have heading', () => {
      const heading = fixture.nativeElement.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading.textContent).toContain('Sprachvalidierung');
    });
  });

  describe('Integration with Services', () => {
    it('should react to all service observables', fakeAsync(() => {
      // Recording
      isRecordingSubject.next(true);
      tick();
      expect(component.isRecording).toBe(true);

      // Last Input
      lastInputSubject.next('Test');
      tick();
      expect(component.lastInput).toBe('Test');

      // Transcript
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Transcript',
        confidence: 0.9,
        isFinal: true
      }));
      tick();
      expect(component.transcripts.length).toBeGreaterThan(0);

      // Validation
      validationResultSubject.next(createFakeValidationResult());
      tick();
      expect(component.lastValidation).toBeTruthy();

      // TTS
      isSpeakingSubject.next(true);
      tick();
      expect(component.isSpeaking).toBe(true);
    }));
  });
});

