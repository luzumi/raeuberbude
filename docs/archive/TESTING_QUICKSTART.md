# Schnellstart: Tests lokal ausführen

## Voraussetzungen

```powershell
# Node.js und npm sollten installiert sein
node --version  # >= 18.x
npm --version   # >= 9.x

# Dependencies installieren (falls noch nicht geschehen)
npm install
```

## Unit-Tests ausführen

### Einmal ausführen (mit Coverage)

```powershell
npm run test:unit
```

**Erwartetes Ergebnis**: 
- Alle Tests grün ✅
- Coverage-Report in `coverage/index.html`

### Watch-Mode (während Entwicklung)

```powershell
npm run test:unit:watch
```

**Nützlich für**: 
- Tests automatisch neu starten bei Code-Änderungen
- Schnelles Feedback während Entwicklung

### Coverage-Report ansehen

```powershell
npm run test:unit
start coverage\index.html
```

Im Browser siehst du dann:
- **Statements**: Zeilen-Abdeckung
- **Branches**: If/Else-Abdeckung
- **Functions**: Funktions-Abdeckung
- **Lines**: Code-Zeilen-Abdeckung

**Ziel**: Alle ≥95%

## E2E-Tests ausführen

### Standard (Headless)

```powershell
npm run test:e2e
```

**Was passiert**:
- Startet Tests im Hintergrund (kein Browser sichtbar)
- Generiert Report in `test-results/`

### Mit UI (Interaktiv)

```powershell
npm run test:e2e:ui
```

**Nützlich für**:
- Tests debuggen
- Einzelne Tests auswählen
- Langsame Ausführung mit Debugger

### Mit sichtbarem Browser

```powershell
npm run test:e2e:headed
```

**Siehst du**:
- Browser öffnet sich
- Test-Schritte in Echtzeit

### Nur Speech-Tests

```powershell
npm run test:e2e:speech
```

**Schneller** als alle E2E-Tests

## Alle Tests auf einmal

```powershell
npm run test:all
```

**Führt aus**:
1. Unit-Tests mit Coverage
2. E2E-Tests

**Dauer**: Ca. 2-5 Minuten

## Häufige Probleme

### Problem: "Chrome failed to start"

**Lösung**:
```powershell
# Chrome installieren oder anderen Browser verwenden
npx playwright install chromium
```

### Problem: Tests laufen ewig

**Lösung**:
```powershell
# Einzelnen Test debuggen
npm run test:e2e:debug
```

### Problem: "MediaRecorder is not defined"

**Normal in JSDOM**:
- Unit-Tests verwenden Mocks
- Keine echte MediaRecorder API nötig
- Prüfe, ob Mock richtig injiziert ist

### Problem: Coverage zu niedrig

**Schritte**:
1. Coverage-Report öffnen: `start coverage\index.html`
2. Rot markierte Zeilen finden
3. Tests für diese Zeilen ergänzen

## Test-Output verstehen

### Unit-Test Output

```
✔ SpeechRecorderService › should start recording (45ms)
✔ SpeechRecorderService › should stop recording (32ms)
✖ SpeechRecorderService › should handle errors (18ms)
   Expected spy stopRecording to have been called
```

**Bedeutung**:
- ✔ = Test bestanden
- ✖ = Test fehlgeschlagen
- (Zeit) = Ausführungsdauer

### E2E-Test Output

```
Running 15 tests using 3 workers
  ✓ speech.spec.ts:10 should complete full flow (2.3s)
  ✓ speech.spec.ts:45 should handle permission denied (1.1s)
```

**Bedeutung**:
- Parallele Ausführung (3 workers)
- Zeit pro Test angezeigt

## Performance-Tipps

### Unit-Tests langsam?

```powershell
# Nur bestimmte Tests ausführen
ng test --include='**/speech-recorder.service.spec.ts'
```

### E2E-Tests langsam?

```powershell
# Parallele Workers erhöhen (in playwright.config.ts)
workers: 5  # Standard: 3
```

### Zu viele Logs?

```powershell
# Weniger Output
npm run test:unit -- --reporters=dots
```

## Nächste Schritte

1. **Tests schreiben**: Siehe `src/testing/README.md`
2. **Coverage verbessern**: Siehe `docs/SPEECH_TESTING.md`
3. **CI/CD einrichten**: Siehe `.github/workflows/test.yml` (TODO)

## Hilfe

- **Test Utilities**: `src/testing/README.md`
- **Test-Strategie**: `docs/SPEECH_TESTING.md`
- **Playwright Docs**: https://playwright.dev
- **Jasmine Docs**: https://jasmine.github.io

---

**Quick Commands Cheatsheet**:

```powershell
npm run test:unit          # Unit-Tests mit Coverage
npm run test:unit:watch    # Unit-Tests Watch-Mode
npm run test:e2e           # E2E-Tests headless
npm run test:e2e:ui        # E2E-Tests interaktiv
npm run test:e2e:speech    # Nur Speech E2E-Tests
npm run test:all           # Alle Tests
start coverage\index.html  # Coverage-Report
```

