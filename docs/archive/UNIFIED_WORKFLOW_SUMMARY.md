# Unified Workflow - Implementierung Zusammenfassung

## Datum: 2025-11-17

## Hauptziele erreicht:

### 1. ✅ Einheitlicher Workflow für alle Terminals
- **ALLE Terminals verwenden jetzt Server-STT** (keine unterschiedlichen Flows mehr)
- Browser-STT wurde deaktiviert wegen zu vieler Probleme (network errors)
- Keine gerätespezifischen Fallbacks oder Unterschiede mehr

### 2. ✅ UserId beim Login in localStorage speichern
- `localStorage.setItem('userId', response.userId)` beim Login
- `sessionStorage.setItem('userId', userId)` als Backup
- SpeechService wird nach Login initialisiert

### 3. ✅ Environment-Konfiguration erweitert
```typescript
// environment.ts
backendApiUrl: 'http://192.168.178.25:4301'  // Für alle Terminals
llmAbortBehavior: 'fail' | 'skip'            // Konfigurierbar
```

### 4. ✅ Abort-Funktionalität implementiert
- `abortCurrentOperation()` - Bricht alles ab und resettet Status
- `forceStopRecording()` - Stoppt Aufnahme sofort
- Alle Timeouts und Promises werden gecanceled
- Dialog wird geschlossen

### 5. ✅ Verbesserter Workflow
```
1. User drückt Mikrofon-Button
   ↓
2. "Höre zu..." wird angezeigt
   ↓
3. User drückt Stop
   ↓
4. "Transkribiere..." wird angezeigt
   ↓
5. "Analysiere..." wird angezeigt
   ↓
6. Dialog öffnet sich mit Ergebnis
```

## Wichtige Änderungen:

### speech.service.ts
- `startRecording()` verwendet jetzt **NUR Server-STT**
- `abortCurrentOperation()` für sauberen Abbruch
- `initializeAfterLogin(userId)` für Post-Login Init
- `setCurrentUserId(userId)` zum Setzen der User-ID
- `lastMediaStream` für sauberes Cleanup
- Exponentielles Backoff für Browser-STT Fehler (deaktiviert)

### auth.service.ts
- `initializeSpeechService(userId)` nach erfolgreichem Login
- Lazy loading des SpeechService
- UserId wird in localStorage UND sessionStorage gespeichert

### header.component.ts
- `abortCurrentOperation()` für Abort-Button
- Besseres Feedback während Verarbeitung

### environment.ts
- `backendApiUrl` für Netzwerk-Zugriff
- `llmAbortBehavior` konfigurierbar

## Workflow-Details:

### Start Recording:
```typescript
async startRecording(): Promise<void> {
  // VEREINHEITLICHT: Alle Terminals → Server-STT
  console.log('[Speech] Starting unified Server-STT workflow for all terminals');
  this.displayStatus('Höre zu...');
  
  await this.startServerRecording({
    silent: false,
    persist: true,
    language: 'de-DE',
    maxDurationMs: this.maxServerRecordingMs
  });
}
```

### Abort Operation:
```typescript
public abortCurrentOperation(): void {
  // Stop recording if active
  if (this.isRecordingSubject.value || this.isServerRecording) {
    this.forceStopRecording();
  }
  
  // Cancel pending operations
  if (this.pendingResultRejecter) {
    this.pendingResultRejecter(new Error('Operation aborted by user'));
  }
  
  // Clear timeouts
  if (this.serverRecordingTimeout) {
    clearTimeout(this.serverRecordingTimeout);
  }
  
  // Reset status
  this.isRecordingSubject.next(false);
  this.displayStatus('Bereit');
  
  // Close dialog
  this.intentActionService.emitResult({
    success: false,
    message: 'Abgebrochen',
    showDialog: false,
    isLoading: false
  });
}
```

## Nächste Schritte (für später):

### 1. Silent Listening Feature
- App kann auf Codewort lauschen
- `initializeAfterLogin()` ist bereits vorbereitet
- Background-Listening implementieren

### 2. LLM Abort Behavior erweitern
```typescript
if (environment.llmAbortBehavior === 'fail') {
  // Fehler-Dialog anzeigen
} else {
  // Ohne LLM weitermachen
}
```

### 3. Dialog-Styling
- Dialoge im App/Route Style
- Fehler-Dialog für LLM offline

### 4. Multi-Terminal gleichzeitige Anfragen
- Queue-System für parallele Requests
- Terminal-ID basierte Isolation

## Bekannte Probleme gelöst:

✅ Browser-STT network errors → Server-STT verwendet
✅ Unterschiedliches Verhalten mobil/localhost → Einheitlicher Flow
✅ UserId nicht im localStorage → Wird beim Login gespeichert
✅ Keine Abort-Funktionalität → Implementiert
✅ Mikrofon-Zugriff Probleme → getUserMedia mit Fallback
✅ Race Conditions → Removed abortBrowserAndFallback
✅ Auto-Start nach Transkription → autoStopEnabled = false (default)

## Testing:

1. **Localhost**: ✅ Funktioniert mit Server-STT
2. **Mobil**: ✅ Gleicher Workflow wie localhost
3. **Multi-Terminal**: Bereit für Testing
4. **Abort**: Implementiert, muss getestet werden

## Logs zum Debugging:

```typescript
[Speech] Starting unified Server-STT workflow for all terminals
[Speech] Höre zu...
[Speech] Transkribiere...
[Speech] Verarbeite...
[Speech] Server STT successful (whisper): "..." (confidence: 0.95)
```

## Wichtig:

- **Keine gerätespezifischen Unterschiede mehr**
- **Alle verwenden Server-STT**
- **Einheitlicher Workflow von Start bis Dialog**
- **UserId wird beim Login gesetzt**
- **Abort-Funktionalität vorhanden**

---

## TODO für nächste Session:

1. [ ] Tests schreiben für einheitlichen Workflow
2. [ ] Abort-Funktionalität UI testen
3. [ ] Multi-Terminal gleichzeitige Requests testen
4. [ ] Dialog-Styling anpassen
5. [ ] LLM Abort Behavior implementieren
6. [ ] Silent Listening Feature (später)


