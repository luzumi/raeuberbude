import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SpeechRecorderService, RecordingResult } from './speech-recorder.service';
import { SpeechTranscriptionService, TranscriptionResult } from './speech-transcription.service';
import { TranscriptionValidatorService, ValidationResult } from './transcription-validator.service';
import { IntentActionService } from './intent-action.service';
import { SpeechPersistenceService } from './speech-persistence.service';
import { TerminalService } from './terminal.service';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Haupt-Service für Spracherkennung
 * Flow: Recording → Transkription → Validation → Intent-Handling → Persistierung
 *
 * Fokussiert auf: Spracheingabe → Text → LLM
 * Keine Browser-STT, kein TTS, klare Service-Trennung
 */
@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  // Observables für UI-Binding
  private readonly isRecordingSubject = new BehaviorSubject<boolean>(false);
  private readonly lastInputSubject = new BehaviorSubject<string>('');
  private readonly transcriptSubject = new Subject<SpeechRecognitionResult>();
  private readonly validationResultSubject = new Subject<ValidationResult>();

  isRecording$ = this.isRecordingSubject.asObservable();
  lastInput$ = this.lastInputSubject.asObservable();
  transcript$ = this.transcriptSubject.asObservable();
  validationResult$ = this.validationResultSubject.asObservable();

  // State
  private recordingStartTime = 0;
  private enableValidation = true;
  private awaitingClarification = false;
  private lastValidationResult: ValidationResult | null = null;

  constructor(
    private readonly recorder: SpeechRecorderService,
    private readonly transcription: SpeechTranscriptionService,
    private readonly validator: TranscriptionValidatorService,
    private readonly intentAction: IntentActionService,
    private readonly persistence: SpeechPersistenceService,
    private readonly terminal: TerminalService
  ) {
    // Load validation preference
    const savedValidation = localStorage.getItem('speech-validation-enabled');
    if (savedValidation !== null) {
      this.enableValidation = savedValidation === 'true';
    }

    // Sync recording state
    this.recorder.isRecording$.subscribe(recording => {
      this.isRecordingSubject.next(recording);
    });
  }

  // ============ PUBLIC API ============

  /**
   * Startet Sprachaufnahme
   */
  async startRecording(): Promise<void> {
    if (this.isRecordingSubject.value) {
      console.warn('[Speech] Already recording');
      return;
    }

    try {
      this.recordingStartTime = Date.now();
      this.displayStatus('Starte Aufnahme...');

      await this.recorder.startRecording({
        maxDurationMs: 30000,
        language: 'de-DE'
      });

      this.displayStatus('Höre zu...');
      console.log('[Speech] Recording started');
    } catch (error: any) {
      console.error('[Speech] Failed to start recording:', error);
      this.displayStatus(`Fehler: ${error.message || 'Mikrofon nicht verfügbar'}`);
      this.isRecordingSubject.next(false);
      throw error;
    }
  }

  /**
   * Stoppt Aufnahme und verarbeitet Ergebnis
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecordingSubject.value) {
      console.warn('[Speech] Not recording');
      return;
    }

    try {
      this.displayStatus('Stoppe Aufnahme...');

      // Recording stoppen
      const recordingResult = await this.recorder.stopRecording();
      console.log('[Speech] Recording stopped:', recordingResult.durationMs, 'ms');

      // Transkribieren
      await this.processRecording(recordingResult);
    } catch (error: any) {
      console.error('[Speech] Failed to stop recording:', error);
      this.displayStatus(`Fehler: ${error.message || 'Verarbeitung fehlgeschlagen'}`);
      this.isRecordingSubject.next(false);
    }
  }

  /**
   * Bricht aktuelle Operation ab
   */
  abortCurrentOperation(): void {
    console.log('[Speech] Aborting operation');

    // Recording abbrechen falls aktiv
    if (this.isRecordingSubject.value) {
      try {
        this.recorder.stopRecording().catch(() => {});
      } catch (error) {
        console.warn('[Speech] Error aborting recording:', error);
      }
    }

    // State zurücksetzen
    this.isRecordingSubject.next(false);
    this.lastInputSubject.next('');
    this.awaitingClarification = false;
    this.lastValidationResult = null;

    // Dialog schließen
    this.intentAction.emitResult({
      success: false,
      message: 'Abgebrochen',
      showDialog: false,
      isLoading: false
    });

    this.displayStatus('Bereit');
  }

  /**
   * Setzt User-ID (nach Login aufrufen)
   */
  setCurrentUserId(userId: string): void {
    this.persistence.setUserId(userId);
    console.log('[Speech] User ID set to:', userId);
  }

  /**
   * Initialisiert Service nach Login
   */
  async initializeAfterLogin(userId: string): Promise<void> {
    this.setCurrentUserId(userId);
    console.log('[Speech] Service initialized for user:', userId);
  }

  /**
   * Validation ein/ausschalten
   */
  setValidationEnabled(enabled: boolean): void {
    this.enableValidation = enabled;
    localStorage.setItem('speech-validation-enabled', String(enabled));
    console.log('[Speech] Validation enabled:', enabled);
  }

  isValidationEnabled(): boolean {
    return this.enableValidation;
  }

  getLastValidationResult(): ValidationResult | null {
    return this.lastValidationResult;
  }

  isAwaitingClarification(): boolean {
    return this.awaitingClarification;
  }

  clearClarification(): void {
    this.awaitingClarification = false;
    this.lastValidationResult = null;
  }

  // ============ PRIVATE PROCESSING ============

  /**
   * Verarbeitet Recording: Transkription → Validation → Intent → Persistierung
   */
  private async processRecording(recording: RecordingResult): Promise<void> {
    const startTime = Date.now();
    this.displayStatus('Transkribiere...');

    try {
      // 1. Transkription
      const transcriptionResult = await this.transcription.transcribe({
        audioBlob: recording.audioBlob,
        mimeType: recording.mimeType,
        language: 'de-DE',
        maxDurationMs: 30000
      });

      const { transcript, confidence, provider, language } = transcriptionResult;
      const processingTime = Date.now() - startTime;

      console.log('[Speech] Transcription result:', {
        transcript: transcript.substring(0, 100),
        confidence,
        provider,
        durationMs: processingTime
      });

      // Emit transcript
      this.transcriptSubject.next({
        transcript,
        confidence,
        isFinal: true
      });

      this.displayStatus(transcript, { final: true });

      // 2. Validation & Intent-Verarbeitung
      if (this.enableValidation) {
        await this.validateAndProcess(transcript, confidence, transcriptionResult);
      } else {
        // Ohne Validation: Direkt speichern
        await this.saveTranscript(transcript, confidence, transcriptionResult);
        this.lastInputSubject.next(transcript);
      }

    } catch (error: any) {
      console.error('[Speech] Processing failed:', error);
      this.displayStatus(`Fehler: ${error.message || 'Verarbeitung fehlgeschlagen'}`);

      // Dialog mit Fehler schließen
      this.intentAction.emitResult({
        success: false,
        message: 'Transkription fehlgeschlagen',
        showDialog: true,
        isLoading: false,
        dialogContent: {
          title: 'Fehler',
          content: `<p>Die Spracherkennung ist fehlgeschlagen: ${error.message}</p>`,
          type: 'general'
        }
      });
    }
  }

  /**
   * Validiert Transkript und verarbeitet Intent
   */
  private async validateAndProcess(
    transcript: string,
    confidence: number,
    transcriptionResult: TranscriptionResult
  ): Promise<void> {
    try {
      // Loading-Dialog anzeigen
      this.intentAction.showLoadingDialog(transcript);
      this.displayStatus('Verarbeite...');

      // Validation durchführen
      const validation = await this.performValidation(transcript, confidence);
      this.lastValidationResult = validation;
      this.validationResultSubject.next(validation);

      // Speichern (immer, auch bei ungültigen Eingaben)
      await this.saveTranscript(transcript, confidence, transcriptionResult, validation);

      // Verarbeitung basierend auf Validation-Ergebnis
      if (validation.isValid && !validation.clarificationNeeded) {
        await this.handleValidTranscription(transcript, validation);
      } else if (validation.clarificationNeeded && validation.clarificationQuestion) {
        await this.handleClarificationNeeded(validation.clarificationQuestion);
      } else {
        await this.handleInvalidTranscription(transcript, validation);
      }

    } catch (error) {
      console.error('[Speech] Validation error:', error);
      this.displayStatus(transcript, { final: true });
      this.lastInputSubject.next(transcript);

      // Auch bei Fehler speichern
      await this.saveTranscript(transcript, confidence, transcriptionResult);
    }
  }

  /**
   * Führt Validation durch
   */
  private async performValidation(
    transcript: string,
    confidence: number
  ): Promise<ValidationResult> {
    if (typeof (this.validator as any)?.validate === 'function') {
      return await (this.validator as any).validate(
        transcript,
        confidence,
        false,
        {
          location: globalThis.location?.pathname || '/',
          userId: this.persistence.getUserId()
        }
      );
    }

    // Fallback wenn Validator nicht verfügbar
    return {
      isValid: true,
      clarificationNeeded: false,
      issues: [],
      intent: null
    } as unknown as ValidationResult;
  }

  /**
   * Verarbeitet valides Transkript mit Intent
   */
  private async handleValidTranscription(
    transcript: string,
    validation: ValidationResult
  ): Promise<void> {
    this.displayStatus(transcript, { final: true });
    this.lastInputSubject.next(transcript);

    if (validation.intent) {
      // Intent verarbeiten
      await this.processIntent(validation.intent);
    } else {
      // Kein Intent - Dialog schließen mit "Verstanden"
      this.intentAction.emitResult({
        success: true,
        message: 'Verstanden',
        showDialog: false,
        isLoading: false
      });
    }
  }

  /**
   * Verarbeitet Intent
   */
  private async processIntent(intent: any): Promise<void> {
    try {
      const actionResult = await this.intentAction.handleIntent(intent);
      console.log('[Speech] Intent processed:', intent.intent, actionResult.success);

      // Dialog aktualisieren
      if (actionResult.showDialog && actionResult.dialogContent) {
        this.intentAction.emitResult({
          ...actionResult,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('[Speech] Intent handling failed:', error);
      this.intentAction.emitResult({
        success: false,
        message: 'Fehler bei Verarbeitung',
        showDialog: true,
        isLoading: false,
        dialogContent: {
          title: 'Fehler',
          content: `<p>Fehler bei der Verarbeitung: ${error}</p>`,
          type: 'general'
        }
      });
    }
  }

  /**
   * Behandelt Clarification-Anfrage
   */
  private async handleClarificationNeeded(question: string): Promise<void> {
    this.displayStatus(question);
    this.awaitingClarification = true;
    this.lastInputSubject.next(`⚠️ ${question}`);

    // Dialog mit Clarification-Frage
    this.intentAction.emitResult({
      success: false,
      message: question,
      showDialog: true,
      isLoading: false,
      dialogContent: {
        title: 'Bitte klarstellen',
        content: `<p>${question}</p><p><em>Bitte sprechen Sie erneut.</em></p>`,
        type: 'general'
      }
    });

    console.log('[Speech] Clarification needed:', question);
  }

  /**
   * Behandelt ungültiges Transkript
   */
  private async handleInvalidTranscription(
    transcript: string,
    validation: ValidationResult
  ): Promise<void> {
    this.displayStatus(`Unsicher: ${transcript}`, { final: true });
    this.lastInputSubject.next(transcript);

    // Dialog mit Hinweis schließen
    this.intentAction.emitResult({
      success: false,
      message: 'Unklare Eingabe',
      showDialog: true,
      isLoading: false,
      dialogContent: {
        title: 'Unklare Eingabe',
        content: `<p>Ich konnte Ihre Eingabe nicht verstehen: "${transcript}"</p>
                  <p><em>Probleme: ${validation.issues?.join(', ') || 'Niedrige Konfidenz'}</em></p>`,
        type: 'general'
      }
    });
  }

  /**
   * Speichert Transkript in Datenbank
   */
  private async saveTranscript(
    transcript: string,
    confidence: number,
    transcriptionResult: TranscriptionResult,
    validation?: ValidationResult
  ): Promise<void> {
    try {
      // Terminal-ID holen (kann null sein)
      let terminalId: string | null = null;
      try {
        const terminalResult = await this.terminal.getMyTerminal();
        if (terminalResult?.success && terminalResult?.data?.terminalId) {
          terminalId = terminalResult.data.terminalId;
        }
      } catch (error) {
        console.warn('[Speech] Could not get terminal ID:', error);
      }

      // Metriken zusammenstellen
      const metrics = {
        audioDurationMs: transcriptionResult.audioDurationMs,
        transcriptionDurationMs: transcriptionResult.transcriptionDurationMs,
        provider: transcriptionResult.provider,
        language: transcriptionResult.language,
        recordingStartedAt: this.recordingStartTime,
        clientNow: Date.now(),
        validationFailed: validation && !validation.isValid,
        validationIssues: validation?.issues || []
      };

      await this.persistence.saveTranscript(transcript, confidence, terminalId, metrics);
    } catch (error) {
      console.warn('[Speech] Failed to save transcript:', error);
      // Nicht werfen - Fehler beim Speichern soll User-Flow nicht unterbrechen
    }
  }

  /**
   * Zeigt Status im UI an
   */
  private displayStatus(message: string, options?: { final?: boolean }): void {
    let text = message || '';

    // JSON-Strukturen kürzen
    if (/^[[{]/.test(text.trim())) {
      try {
        const parsed = JSON.parse(text);
        text = '[Struktur erkannt]';
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed).slice(0, 3).join(', ');
          text += ` Keys: ${keys}`;
        }
      } catch {
        // Kein JSON, ignore
      }
    }

    // Text kürzen
    const maxLen = options?.final ? 160 : 60;
    if (text.length > maxLen) {
      text = text.slice(0, maxLen - 3) + '...';
    }

    this.lastInputSubject.next(text);
  }
}

