import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {SpeechService} from '../../core/services/speech.service';
import { TtsService } from '../../core/services/tts.service';
import { ValidationResult } from '../../core/services/transcription-validator.service';

@Component({
  selector: 'app-speech-validation-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="speech-validation-demo">
      <h2>Sprachvalidierung & Feedback Demo</h2>

      <!-- Status Display -->
      <div class="status-panel">
        <div class="status-item">
          <span class="label">Aufnahme:</span>
          <span class="value" [class.active]="isRecording">
            {{ isRecording ? '🔴 Aktiv' : '⚪ Bereit' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">TTS:</span>
          <span class="value" [class.active]="isSpeaking">
            {{ isSpeaking ? '🔊 Spricht' : '🔇 Still' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Wartet auf Klarstellung:</span>
          <span class="value" [class.warning]="awaitingClarification">
            {{ awaitingClarification ? '⚠️ Ja' : '✅ Nein' }}
          </span>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button
          (click)="toggleRecording()"
          [disabled]="isSpeaking"
          [class.recording]="isRecording">
          {{ isRecording ? '⏹️ Stop' : '🎤 Start Aufnahme' }}
        </button>

        <button
          (click)="cancelSpeech()"
          [disabled]="!isSpeaking">
          🔇 TTS Abbrechen
        </button>

        <button (click)="clearClarification()">
          🗑️ Klarstellung löschen
        </button>
      </div>

      <!-- Settings -->
      <div class="settings">
        <h3>Einstellungen</h3>
        <label>
          <input
            type="checkbox"
            [(ngModel)]="validationEnabled"
            (change)="onValidationToggle()">
          Validierung aktivieren
        </label>
        <label>
          <input
            type="checkbox"
            [(ngModel)]="ttsEnabled"
            (change)="onTTSToggle()">
          Sprachausgabe aktivieren
        </label>
        <label>
          <span>STT Modus:</span>
          <select [(ngModel)]="sttMode" (change)="onSTTModeChange()">
            <option value="auto">Auto</option>
            <option value="browser">Browser</option>
            <option value="server">Server</option>
          </select>
        </label>
      </div>

      <!-- Last Input -->
      <div class="last-input" *ngIf="lastInput">
        <h3>Letzte Eingabe:</h3>
        <div class="input-text">{{ lastInput }}</div>
      </div>

      <!-- Validation Result -->
      <div class="validation-result" *ngIf="lastValidation">
        <h3>Validierungsergebnis:</h3>
        <div class="result-grid">
          <div class="result-item">
            <span class="label">Gültig:</span>
            <span [class.success]="lastValidation.isValid" [class.error]="!lastValidation.isValid">
              {{ lastValidation.isValid ? '✅ Ja' : '❌ Nein' }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">Konfidenz:</span>
            <span [class]="getConfidenceClass(lastValidation.confidence)">
              {{ (lastValidation.confidence * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="result-item">
            <span class="label">Mehrdeutigkeit:</span>
            <span [class.warning]="lastValidation.hasAmbiguity">
              {{ lastValidation.hasAmbiguity ? '⚠️ Ja' : '✅ Nein' }}
            </span>
          </div>
          <div class="result-item" *ngIf="lastValidation.clarificationNeeded">
            <span class="label">Klarstellung nötig:</span>
            <span class="warning">⚠️ Ja</span>
          </div>
        </div>

        <div class="clarification-question" *ngIf="lastValidation.clarificationQuestion">
          <strong>Frage:</strong>
          <p>{{ lastValidation.clarificationQuestion }}</p>
        </div>

        <div class="issues" *ngIf="lastValidation.issues && lastValidation.issues.length > 0">
          <strong>Probleme:</strong>
          <ul>
            <li *ngFor="let issue of lastValidation.issues">{{ issue }}</li>
          </ul>
        </div>
      </div>

      <!-- Test TTS -->
      <div class="tts-test">
        <h3>TTS Testen:</h3>
        <input
          type="text"
          [(ngModel)]="testMessage"
          placeholder="Testnachricht eingeben..."
          (keyup.enter)="speakTestMessage()">
        <button (click)="speakTestMessage()" [disabled]="!testMessage || isSpeaking">
          🔊 Sprechen
        </button>
      </div>

      <!-- Transcript History -->
      <div class="transcript-history" *ngIf="transcripts.length > 0">
        <h3>Transkript-Verlauf:</h3>
        <div class="transcript-list">
          <div
            *ngFor="let t of transcripts; let i = index"
            class="transcript-item"
            [class.final]="t.isFinal">
            <span class="index">{{ i + 1 }}.</span>
            <span class="text">{{ t.transcript }}</span>
            <span class="confidence" [class]="getConfidenceClass(t.confidence)">
              {{ (t.confidence * 100).toFixed(0) }}%
            </span>
            <span class="type">{{ t.isFinal ? '✅' : '...' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .speech-validation-demo {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    h2 {
      color: #333;
      margin-bottom: 20px;
    }

    h3 {
      color: #555;
      margin: 15px 0 10px;
      font-size: 1.1em;
    }

    .status-panel {
      display: flex;
      gap: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .status-item .label {
      font-size: 0.85em;
      color: #666;
    }

    .status-item .value {
      font-weight: 600;
      color: #333;
    }

    .status-item .value.active {
      color: #e74c3c;
    }

    .status-item .value.warning {
      color: #f39c12;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    button {
      padding: 10px 20px;
      font-size: 1em;
      border: none;
      border-radius: 6px;
      background: #3498db;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    button:hover:not(:disabled) {
      background: #2980b9;
      transform: translateY(-1px);
    }

    button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    button.recording {
      background: #e74c3c;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .settings {
      padding: 15px;
      background: #ecf0f1;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .settings label {
      display: block;
      margin: 10px 0;
      cursor: pointer;
    }

    .settings input[type="checkbox"] {
      margin-right: 8px;
      cursor: pointer;
    }

    .settings select {
      margin-left: 10px;
      padding: 5px 10px;
      border-radius: 4px;
      border: 1px solid #bdc3c7;
    }

    .last-input {
      padding: 15px;
      background: #e8f8f5;
      border-left: 4px solid #27ae60;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .input-text {
      font-size: 1.1em;
      margin-top: 10px;
      font-weight: 500;
    }

    .validation-result {
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #f39c12;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin: 10px 0;
    }

    .result-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .success {
      color: #27ae60;
      font-weight: 600;
    }

    .error {
      color: #e74c3c;
      font-weight: 600;
    }

    .warning {
      color: #f39c12;
      font-weight: 600;
    }

    .confidence-high {
      color: #27ae60;
      font-weight: 600;
    }

    .confidence-medium {
      color: #f39c12;
      font-weight: 600;
    }

    .confidence-low {
      color: #e74c3c;
      font-weight: 600;
    }

    .clarification-question {
      margin-top: 15px;
      padding: 10px;
      background: white;
      border-radius: 4px;
    }

    .clarification-question p {
      margin: 5px 0 0;
      font-size: 1.05em;
    }

    .issues {
      margin-top: 15px;
      padding: 10px;
      background: white;
      border-radius: 4px;
    }

    .issues ul {
      margin: 5px 0 0 20px;
    }

    .tts-test {
      padding: 15px;
      background: #e3f2fd;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .tts-test input {
      width: calc(100% - 120px);
      padding: 10px;
      border: 1px solid #bdc3c7;
      border-radius: 4px;
      margin-right: 10px;
      font-size: 1em;
    }

    .transcript-history {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .transcript-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .transcript-item {
      display: grid;
      grid-template-columns: 30px 1fr 60px 30px;
      gap: 10px;
      padding: 8px;
      margin: 5px 0;
      background: white;
      border-radius: 4px;
      align-items: center;
    }

    .transcript-item.final {
      border-left: 3px solid #27ae60;
    }

    .transcript-item .index {
      color: #999;
      font-size: 0.9em;
    }

    .transcript-item .text {
      flex: 1;
    }

    .transcript-item .confidence {
      text-align: right;
      font-size: 0.9em;
    }

    .transcript-item .type {
      text-align: center;
    }
  `]
})
export class SpeechValidationDemoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isRecording = false;
  isSpeaking = false;
  awaitingClarification = false;
  lastInput = '';
  lastValidation: ValidationResult | null = null;
  transcripts: Array<{ transcript: string; confidence: number; isFinal: boolean }> = [];

  validationEnabled = true;
  ttsEnabled = true;
  sttMode: 'auto' | 'browser' | 'server' = 'auto';

  testMessage = 'Hallo, ich bin ein Test der Sprachausgabe.';

  constructor(
    private speechService: SpeechService,
    private ttsService: TtsService
  ) {}

  ngOnInit(): void {
    // Subscribe to speech service observables
    this.speechService.isRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isRecording => {
        this.isRecording = isRecording;
      });

    this.speechService.lastInput$
      .pipe(takeUntil(this.destroy$))
      .subscribe(input => {
        this.lastInput = input;
      });

    this.speechService.transcript$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.transcripts.push(result);
        // Keep only last 10 transcripts
        if (this.transcripts.length > 10) {
          this.transcripts.shift();
        }
      });

    this.speechService.validationResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(validation => {
        this.lastValidation = validation;
        this.awaitingClarification = this.speechService.isAwaitingClarification();
      });

    this.ttsService.isSpeaking$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSpeaking => {
        this.isSpeaking = isSpeaking;
      });

    // Load current settings
    this.validationEnabled = this.speechService.isValidationEnabled();
    // this.ttsEnabled = this.speechService.isTTSEnabled();
    // this.sttMode = this.speechService.getSTTMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      await this.speechService.stopRecording();
    } else {
      try {
        await this.speechService.startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  }

  cancelSpeech(): void {
    // this.speechService.cancelSpeech();
  }

  clearClarification(): void {
    this.speechService.clearClarification();
    this.awaitingClarification = false;
    this.lastValidation = null;
  }

  onValidationToggle(): void {
    this.speechService.setValidationEnabled(this.validationEnabled);
  }

  onTTSToggle(): void {
    // this.speechService.setTTSEnabled(this.ttsEnabled);
  }

  onSTTModeChange(): void {
    // this.speechService.setSTTMode(this.sttMode);
  }

  async speakTestMessage(): Promise<void> {
    if (this.testMessage) {
      try {
        // await this.speechService.speak(this.testMessage);
      } catch (error) {
        console.error('Failed to speak test message:', error);
      }
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }
}

