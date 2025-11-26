# Test Utilities für Spracheingabe-Pipeline

Diese Test-Utilities erleichtern das Testen der Speech-Services und -Komponenten.

## Verfügbare Mocks

### MockMediaRecorder
Simuliert `MediaRecorder` für Unit-Tests.

```typescript
import { MockMediaRecorder } from './mock-media-recorder';

// In beforeEach:
const mockRecorder = new MockMediaRecorder();
spyOn(window as any, 'MediaRecorder').and.returnValue(mockRecorder);

// Im Test:
mockRecorder.triggerDataAvailable(new Blob(['test'], { type: 'audio/webm' }));
mockRecorder.triggerStop();
```

### mockGetUserMedia
Simuliert `navigator.mediaDevices.getUserMedia`.

```typescript
import { mockGetUserMedia, createMockMediaStream } from './mock-getusermedia';

// Success:
mockGetUserMedia(true);

// Permission denied:
mockGetUserMedia(false, 'NotAllowedError');

// No device:
mockGetUserMedia(false, 'NotFoundError');
```

### HTTP Mocks
Simuliert Backend-Antworten für `/api/speech/transcribe`.

```typescript
import { mockTranscribeResponse, mockTranscribeError } from './http-mocks';

const httpMock = TestBed.inject(HttpTestingController);
const req = httpMock.expectOne('/api/speech/transcribe');
req.flush(mockTranscribeResponse({ transcript: 'Test', confidence: 0.95 }));
```

### Test Helpers
DI-Provider-Factories für einfache Injektion.

```typescript
import { provideMockSpeechService, provideMockTtsService } from './test-helpers';

TestBed.configureTestingModule({
  providers: [
    provideMockSpeechService(),
    provideMockTtsService()
  ]
});
```

## Verwendung in Tests

### Unit-Test Beispiel

```typescript
import { TestBed } from '@angular/core/testing';
import { SpeechRecorderService } from '../app/core/services/speech-recorder.service';
import { MockMediaRecorder } from './mock-media-recorder';
import { mockGetUserMedia } from './mock-getusermedia';

describe('SpeechRecorderService', () => {
  let service: SpeechRecorderService;
  let mockRecorder: MockMediaRecorder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpeechRecorderService);
    
    mockRecorder = new MockMediaRecorder();
    spyOn(window as any, 'MediaRecorder').and.returnValue(mockRecorder);
    mockGetUserMedia(true);
  });

  it('should record audio', async () => {
    const recordingPromise = service.startRecording();
    
    // Simuliere Daten und Stop
    mockRecorder.triggerDataAvailable(new Blob(['test']));
    mockRecorder.triggerStop();
    
    const result = await service.stopRecording();
    expect(result.audioBlob).toBeDefined();
  });
});
```

### Komponenten-Test Beispiel

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpeechFeedbackComponent } from '../app/shared/components/speech-feedback/speech-feedback.component';
import { provideMockSpeechService } from './test-helpers';

describe('SpeechFeedbackComponent', () => {
  let component: SpeechFeedbackComponent;
  let fixture: ComponentFixture<SpeechFeedbackComponent>;
  let mockSpeechService: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeechFeedbackComponent],
      providers: [provideMockSpeechService()]
    }).compileComponents();

    mockSpeechService = TestBed.inject(SpeechService);
    fixture = TestBed.createComponent(SpeechFeedbackComponent);
    component = fixture.componentInstance;
  });

  it('should show clarification banner', () => {
    mockSpeechService.validationResult$.next({
      clarificationNeeded: true,
      clarificationQuestion: 'Test?'
    });
    fixture.detectChanges();
    
    const banner = fixture.nativeElement.querySelector('.clarification-banner');
    expect(banner).toBeTruthy();
  });
});
```

## Coverage-Ziel

- Unit-Tests: ≥98%
- Integration-Tests: ≥95%
- E2E-Tests: Kritische User-Flows

## Lokale Ausführung

```powershell
# Unit-Tests mit Coverage
npm run test:unit

# E2E-Tests
npm run test:e2e

# Alle Tests
npm run test:all

# Coverage-Report öffnen
start coverage/index.html
```

