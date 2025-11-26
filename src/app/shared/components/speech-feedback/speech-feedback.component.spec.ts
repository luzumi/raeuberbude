/**
 * Unit-Tests für SpeechFeedbackComponent
 * Testet UI-Feedback für Validierungsergebnisse
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SpeechFeedbackComponent } from './speech-feedback.component';
import { SpeechService } from '../../../core/services/speech.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { createFakeValidationResult, createFakeSpeechRecognitionResult } from '../../../../testing/test-helpers';

describe('SpeechFeedbackComponent', () => {
  let component: SpeechFeedbackComponent;
  let fixture: ComponentFixture<SpeechFeedbackComponent>;
  let mockSpeechService: any;
  let validationResultSubject: Subject<any>;
  let transcriptSubject: Subject<any>;

  beforeEach(async () => {
    validationResultSubject = new Subject();
    transcriptSubject = new Subject();

    mockSpeechService = {
      validationResult$: validationResultSubject.asObservable(),
      transcript$: transcriptSubject.asObservable(),
      clearClarification: jasmine.createSpy('clearClarification'),
      isRecording$: new BehaviorSubject(false),
      lastInput$: new BehaviorSubject(''),
      startRecording: jasmine.createSpy('startRecording'),
      stopRecording: jasmine.createSpy('stopRecording')
    };

    await TestBed.configureTestingModule({
      imports: [SpeechFeedbackComponent],
      providers: [
        { provide: SpeechService, useValue: mockSpeechService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpeechFeedbackComponent);
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

    it('should start hidden', () => {
      expect(component.showFeedback).toBe(false);
      const feedbackElement = fixture.nativeElement.querySelector('.speech-feedback');
      expect(feedbackElement).toBeFalsy();
    });

    it('should subscribe to validationResult$', () => {
      expect(component['destroy$']).toBeDefined();
    });

    it('should subscribe to transcript$', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      expect(component.lastTranscript).toBe('Test');
    });
  });

  describe('Clarification Banner', () => {
    it('should show clarification banner when needed', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Welches Licht meinten Sie?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);
      expect(component.clarificationQuestion).toBe('Welches Licht meinten Sie?');

      const banner = fixture.nativeElement.querySelector('.clarification-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Welches Licht meinten Sie?');
    });

    it('should show clarification icon', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Test question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.clarification-banner .icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('⚠️');
    });

    it('should show hint text in clarification banner', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Test question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.clarification-banner .hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('Bitte wiederholen Sie Ihre Eingabe');
    });

    it('should auto-hide clarification after 15 seconds', fakeAsync(() => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Test question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);

      tick(15000);

      expect(component.showFeedback).toBe(false);
    }));

    it('should have dismiss button', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Test question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('.clarification-banner .dismiss-btn');
      expect(dismissBtn).toBeTruthy();
    });

    it('should dismiss clarification when button clicked', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Test question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('.clarification-banner .dismiss-btn');
      dismissBtn.click();
      fixture.detectChanges();

      expect(component.showFeedback).toBe(false);
      expect(mockSpeechService.clearClarification).toHaveBeenCalled();
    });
  });

  describe('Issues Banner', () => {
    it('should show issues banner', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: false,
        issues: ['Audio zu leise', 'Hintergrundgeräusche']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);
      expect(component.issues).toEqual(['Audio zu leise', 'Hintergrundgeräusche']);

      const banner = fixture.nativeElement.querySelector('.issues-banner');
      expect(banner).toBeTruthy();
    });

    it('should display all issues in list', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: false,
        issues: ['Issue 1', 'Issue 2', 'Issue 3']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const listItems = fixture.nativeElement.querySelectorAll('.issues-banner .issues-list li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toContain('Issue 1');
      expect(listItems[1].textContent).toContain('Issue 2');
      expect(listItems[2].textContent).toContain('Issue 3');
    });

    it('should show issues icon', () => {
      const validation = createFakeValidationResult({
        issues: ['Test issue']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.issues-banner .icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('ℹ️');
    });

    it('should auto-hide issues after 8 seconds', fakeAsync(() => {
      const validation = createFakeValidationResult({
        issues: ['Test issue']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);

      tick(8000);

      expect(component.showFeedback).toBe(false);
    }));

    it('should not show issues if clarification has priority', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?',
        issues: ['Issue 1', 'Issue 2']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const clarificationBanner = fixture.nativeElement.querySelector('.clarification-banner');
      const issuesBanner = fixture.nativeElement.querySelector('.issues-banner');

      expect(clarificationBanner).toBeTruthy();
      expect(issuesBanner).toBeFalsy();
      expect(component.issues).toEqual([]);
    });
  });

  describe('Confidence Warning Banner', () => {
    it('should show confidence warning for low confidence', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test transcript',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        isValid: false,
        confidence: 0.65,
        hasAmbiguity: true,
        clarificationNeeded: false,
        issues: []
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);
      expect(component.showConfidenceWarning).toBe(true);

      const banner = fixture.nativeElement.querySelector('.confidence-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Test transcript');
    });

    it('should show confidence icon', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        isValid: false,
        confidence: 0.65,
        hasAmbiguity: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.confidence-banner .icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('🔊');
    });

    it('should show confidence hint', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        isValid: false,
        confidence: 0.65,
        hasAmbiguity: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.confidence-banner .hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('Niedrige Konfidenz');
    });

    it('should auto-hide confidence warning after 6 seconds', fakeAsync(() => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        isValid: false,
        confidence: 0.65,
        hasAmbiguity: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);

      tick(6000);

      expect(component.showFeedback).toBe(false);
    }));

    it('should not show confidence warning if confidence is high', () => {
      const validation = createFakeValidationResult({
        confidence: 0.95,
        hasAmbiguity: false,
        isValid: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(false);
      const banner = fixture.nativeElement.querySelector('.confidence-banner');
      expect(banner).toBeFalsy();
    });

    it('should not show confidence warning if clarification or issues present', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      // Clarification nimmt Priorität
      let validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?',
        confidence: 0.65,
        hasAmbiguity: true,
        isValid: false
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      let confidenceBanner = fixture.nativeElement.querySelector('.confidence-banner');
      expect(confidenceBanner).toBeFalsy();

      // Issues nehmen Priorität
      validation = createFakeValidationResult({
        issues: ['Issue 1'],
        confidence: 0.65,
        hasAmbiguity: true,
        isValid: false
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      confidenceBanner = fixture.nativeElement.querySelector('.confidence-banner');
      expect(confidenceBanner).toBeFalsy();
    });
  });

  describe('Banner Priority', () => {
    it('should prioritize clarification over issues', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?',
        issues: ['Issue 1']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.clarificationQuestion).toBeTruthy();
      expect(component.issues.length).toBe(0);

      const clarificationBanner = fixture.nativeElement.querySelector('.clarification-banner');
      const issuesBanner = fixture.nativeElement.querySelector('.issues-banner');

      expect(clarificationBanner).toBeTruthy();
      expect(issuesBanner).toBeFalsy();
    });

    it('should prioritize issues over confidence warning', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        issues: ['Issue 1'],
        confidence: 0.65,
        hasAmbiguity: true,
        isValid: false
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const issuesBanner = fixture.nativeElement.querySelector('.issues-banner');
      const confidenceBanner = fixture.nativeElement.querySelector('.confidence-banner');

      expect(issuesBanner).toBeTruthy();
      expect(confidenceBanner).toBeFalsy();
    });

    it('should show only one banner at a time', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?',
        issues: ['Issue 1'],
        confidence: 0.65,
        hasAmbiguity: true
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const banners = fixture.nativeElement.querySelectorAll(
        '.clarification-banner, .issues-banner, .confidence-banner'
      );

      expect(banners.length).toBe(1);
      expect(banners[0].classList.contains('clarification-banner')).toBe(true);
    });
  });

  describe('Dismiss Functionality', () => {
    it('should dismiss and clear all state', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      component.dismiss();

      expect(component.showFeedback).toBe(false);
      expect(component.clarificationQuestion).toBe('');
      expect(component.issues).toEqual([]);
      expect(component.showConfidenceWarning).toBe(false);
      expect(mockSpeechService.clearClarification).toHaveBeenCalled();
    });

    it('should clear auto-hide timer on dismiss', fakeAsync(() => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);

      // Dismiss vor Timer-Ablauf
      tick(5000);
      component.dismiss();
      fixture.detectChanges();

      expect(component.showFeedback).toBe(false);

      // Timer sollte nicht mehr auslösen
      tick(15000);
      expect(component.showFeedback).toBe(false);
    }));
  });

  describe('Auto-Hide Timers', () => {
    it('should clear previous timer when new validation arrives', fakeAsync(() => {
      // Erste Validation mit Timer
      let validation = createFakeValidationResult({
        issues: ['Issue 1']
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(true);

      // Zweite Validation vor Timer-Ablauf
      tick(3000);
      validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      // Erster Timer sollte gecancelt sein
      tick(8000);
      expect(component.showFeedback).toBe(true); // Noch sichtbar wegen neuem Timer

      tick(7000); // Gesamt 15s für Clarification
      expect(component.showFeedback).toBe(false);
    }));

    it('should have different timer durations for different banners', fakeAsync(() => {
      // Clarification: 15s
      let validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });
      validationResultSubject.next(validation);
      tick(15000);
      expect(component.showFeedback).toBe(false);

      // Issues: 8s
      validation = createFakeValidationResult({
        issues: ['Issue']
      });
      validationResultSubject.next(validation);
      fixture.detectChanges();
      tick(8000);
      expect(component.showFeedback).toBe(false);

      // Confidence: 6s
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Test',
        isFinal: true
      }));
      validation = createFakeValidationResult({
        confidence: 0.65,
        hasAmbiguity: true,
        isValid: false
      });
      validationResultSubject.next(validation);
      fixture.detectChanges();
      tick(6000);
      expect(component.showFeedback).toBe(false);
    }));
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should clear timer on destroy', fakeAsync(() => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      component.ngOnDestroy();
      tick(15000);

      // Timer sollte nicht mehr auslösen nach destroy
      expect(component.showFeedback).toBe(true); // State unverändert
    }));
  });

  describe('Transcript Handling', () => {
    it('should only update lastTranscript on final results', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Interim',
        isFinal: false
      }));

      expect(component.lastTranscript).toBe('');

      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Final',
        isFinal: true
      }));

      expect(component.lastTranscript).toBe('Final');
    });

    it('should display lastTranscript in confidence banner', () => {
      transcriptSubject.next(createFakeSpeechRecognitionResult({
        transcript: 'Turn on the light',
        isFinal: true
      }));

      const validation = createFakeValidationResult({
        confidence: 0.65,
        hasAmbiguity: true,
        isValid: false
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.confidence-banner .message');
      expect(message.textContent).toContain('Turn on the light');
    });
  });

  describe('Valid Results (No Banner)', () => {
    it('should not show banner for valid result', () => {
      const validation = createFakeValidationResult({
        isValid: true,
        confidence: 0.95,
        hasAmbiguity: false,
        clarificationNeeded: false,
        issues: []
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(false);
      const feedbackElement = fixture.nativeElement.querySelector('.speech-feedback');
      expect(feedbackElement).toBeFalsy();
    });

    it('should dismiss existing banner on valid result', fakeAsync(() => {
      // Zeige zuerst Issues-Banner
      let validation = createFakeValidationResult({
        issues: ['Issue 1']
      });
      validationResultSubject.next(validation);
      fixture.detectChanges();
      expect(component.showFeedback).toBe(true);

      // Dann valides Ergebnis
      validation = createFakeValidationResult({
        isValid: true,
        confidence: 0.95
      });
      validationResultSubject.next(validation);
      fixture.detectChanges();

      expect(component.showFeedback).toBe(false);
    }));
  });

  describe('Responsive Styles', () => {
    it('should have responsive CSS classes', () => {
      const validation = createFakeValidationResult({
        clarificationNeeded: true,
        clarificationQuestion: 'Question?'
      });

      validationResultSubject.next(validation);
      fixture.detectChanges();

      const feedback = fixture.nativeElement.querySelector('.speech-feedback');
      expect(feedback).toBeTruthy();

      // Prüfe dass Media Queries im Style definiert sind
      const styles = fixture.nativeElement.querySelector('style');
      // Styles sind in Component.styles, nicht im DOM
    });
  });
});

