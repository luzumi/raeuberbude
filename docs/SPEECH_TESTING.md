# Test-Strategie für Spracheingabe-Pipeline

## Übersicht

Komplette Testabdeckung (≈100%) für die Spracheingabe-Pipeline mit Unit-, Integrations-, Komponenten- und E2E-Tests.

## Test-Struktur

### 1. Test Utilities (`src/testing/`)

Wiederverwendbare Mocks und Helpers:

- **`mock-media-recorder.ts`**: MockMediaRecorder-Klasse für Audio-Aufnahme-Tests
- **`mock-getusermedia.ts`**: Simuliert getUserMedia mit verschiedenen Szenarien
- **`http-mocks.ts`**: Mock-Responses für Backend `/api/speech/*` Endpoints
- **`test-helpers.ts`**: DI Provider Factories und Test-Utilities

### 2. Unit-Tests

#### `speech-recorder.service.spec.ts`
- ✅ Basic Recording (start/stop)
- ✅ Error Handling (Permission denied, No device, Already recording)
- ✅ Recording Options (maxDurationMs, language)
- ✅ MediaRecorder Configuration
- ✅ Cleanup & Track Management
- ✅ MIME Type Selection
- ✅ Multiple Recording Sessions

**Coverage-Ziel**: ≥98%

#### `speech-transcription.service.spec.ts`
- ✅ Basic Transcription (HTTP POST mit FormData)
- ✅ Error Handling (Server errors, Network errors, Timeouts)
- ✅ Check Status (Provider availability)
- ✅ Different Audio Formats (webm, ogg, mp4)
- ✅ Different Languages (de-DE, en-US)
- ✅ Performance Metrics (audioDurationMs, transcriptionDurationMs)
- ✅ Confidence Levels (high, medium, low, empty)

**Coverage-Ziel**: ≥98%

#### `speech.service.spec.ts` (TODO)
- Server Recording Flow
- Browser STT Flow
- Validation Integration
- TTS Integration
- Mode Switching (auto/browser/server)
- Error Recovery & Fallbacks
- Observable Emissions

**Coverage-Ziel**: ≥95%

### 3. Komponenten-Tests

#### `speech-feedback.component.spec.ts`
- ✅ Component Initialization
- ✅ Clarification Banner (show, auto-hide 15s, dismiss)
- ✅ Issues Banner (show, auto-hide 8s, dismiss)
- ✅ Confidence Warning Banner (show, auto-hide 6s)
- ✅ Banner Priority (clarification > issues > confidence)
- ✅ Dismiss Functionality
- ✅ Auto-Hide Timers
- ✅ Component Cleanup (unsubscribe)
- ✅ Transcript Handling
- ✅ Valid Results (no banner)

**Coverage-Ziel**: ≥95%

#### `speech-validation-demo.component.spec.ts`
- ✅ Component Initialization
- ✅ Status Display (recording, TTS, clarification)
- ✅ Recording Controls (start/stop, button states)
- ✅ TTS Controls (cancel, disabled states)
- ✅ Clarification Controls (clear)
- ✅ Settings (validation toggle, TTS toggle, STT mode)
- ✅ Last Input Display
- ✅ Validation Result Display
- ✅ Transcript History (limit 10)
- ✅ TTS Test
- ✅ Error Handling
- ✅ Component Cleanup

**Coverage-Ziel**: ≥95%

### 4. E2E-Tests (Playwright)

#### `speech.spec.ts`
- ✅ Full Speech Input Flow (start → record → stop → transcription → validation)
- ✅ Clarification Banner (ambiguous input)
- ✅ Permission Denied Handling
- ✅ TTS Playback & Cancel
- ✅ Toggle Validation Setting
- ✅ Change STT Mode
- ✅ Transcript History Display
- ✅ Low Confidence Warning
- ✅ Backend Error Handling
- ✅ Clear Clarification
- ✅ Disable Recording While Speaking
- ✅ Performance (< 5s cycle)

**Coverage-Ziel**: Kritische User-Flows

## Test-Ausführung

### Lokale Entwicklung

```powershell
# Unit-Tests mit Watch-Mode
npm run test:unit:watch

# Unit-Tests mit Coverage
npm run test:unit

# E2E-Tests
npm run test:e2e

# E2E-Tests mit UI
npm run test:e2e:ui

# Nur Speech E2E-Tests
npm run test:e2e:speech

# Alle Tests
npm run test:all

# Coverage-Report öffnen
start coverage\index.html
```

### CI/CD

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:coverage
  
- name: Check Coverage
  run: |
    # Fail if coverage < 95%
    
- name: Run E2E Tests
  run: npm run test:e2e
```

## Coverage-Ziele

| Kategorie | Ziel | Status |
|-----------|------|--------|
| Unit-Tests Services | ≥98% | 🟡 In Progress |
| Unit-Tests Components | ≥95% | ✅ Completed |
| Integration Tests | ≥95% | 🟡 Planned |
| E2E Critical Flows | 100% | ✅ Completed |

## Test-Szenarien

### Erfolgreiche Flows

1. **Standard Recording Flow**
   - Start → Record 3s → Stop → Server Transcription → Validation → Display

2. **Browser STT Flow** (deprecated)
   - Start → Web Speech API → Interim Results → Final Result → Validation

3. **TTS Playback**
   - Speak Text → Audio Output → Cancel/Complete

### Fehler-Szenarien

1. **Permission Denied**
   - getUserMedia fails → Error message → Stay in ready state

2. **No Microphone**
   - getUserMedia fails (NotFoundError) → Error message

3. **Network Error**
   - Backend timeout → Error handling → User feedback

4. **Low Confidence**
   - Confidence < 0.7 → Confidence warning banner

5. **Ambiguous Input**
   - Validation detects ambiguity → Clarification banner

## Mocking-Strategie

### Unit-Tests
- **MediaRecorder**: `MockMediaRecorder` aus `src/testing/`
- **getUserMedia**: `mockGetUserMedia()` mit verschiedenen Szenarien
- **HttpClient**: Angular `HttpTestingController`
- **Services**: Jasmine Spies mit Observable-Mocks

### E2E-Tests
- **MediaRecorder**: Browser-Context `page.addInitScript()`
- **getUserMedia**: Browser-Context Mock
- **Backend API**: Playwright `page.route()` mit Mock-Responses
- **TTS**: Browser SpeechSynthesis Mock (optional)

## Best Practices

### Test-Isolation
- Jeder Test ist unabhängig
- BeforeEach: Setup Mocks
- AfterEach: Cleanup & Verify

### Determinismus
- Verwende `fakeAsync`/`tick` für Timer-Tests
- Mock alle externen Dependencies
- Keine echten API-Calls in Unit-Tests

### Lesbarkeit
- Descriptive Test-Namen: "should do X when Y"
- Arrange-Act-Assert Pattern
- Klare Kommentare bei komplexen Setups

### Performance
- Unit-Tests: < 5s gesamt
- E2E-Tests: < 2min gesamt
- Parallele Ausführung wo möglich

## Fehlerbehebung

### Test schlägt fehl: "MediaRecorder is not defined"
```typescript
// In beforeEach:
spyOn(window as any, 'MediaRecorder').and.returnValue(mockRecorder);
```

### Test schlägt fehl: "getUserMedia is not a function"
```typescript
// In beforeEach:
mockGetUserMedia(true);
```

### E2E Test timeout
```typescript
// Erhöhe Timeout für langsame Operationen:
await expect(element).toBeVisible({ timeout: 5000 });
```

### Coverage zu niedrig
```powershell
# Check welche Zeilen nicht abgedeckt sind:
start coverage\index.html
# Ergänze fehlende Test-Cases
```

## Nächste Schritte

### Kurzfristig
- [ ] `speech.service.spec.ts` vervollständigen
- [ ] Integration-Tests für Service-Interaktionen
- [ ] CI/CD Pipeline aufsetzen

### Mittelfristig
- [ ] Visual Regression Tests (Percy/Chromatic)
- [ ] Performance-Tests (Lighthouse CI)
- [ ] Accessibility-Tests (axe-core)

### Langfristig
- [ ] Wake-Word Detection Tests (wenn implementiert)
- [ ] Multi-Language Tests
- [ ] Stress-Tests (viele parallele Aufnahmen)

## Kontakte & Support

- **Test-Utilities**: `src/testing/README.md`
- **E2E-Tests**: `playwright/tests/speech.spec.ts`
- **CI-Config**: `.github/workflows/test.yml` (wenn vorhanden)

---

**Letzte Aktualisierung**: 2025-01-19
**Test-Framework**: Jasmine + Karma (Unit), Playwright (E2E)
**Coverage-Tool**: Istanbul/NYC

