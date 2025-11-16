import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SpeechService } from '../../../core/services/speech.service';
import { ValidationResult } from '../../../core/services/transcription-validator.service';

@Component({
  selector: 'app-speech-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="speech-feedback" *ngIf="showFeedback">
      <!-- Klarstellungsfrage -->
      <div class="clarification-banner" *ngIf="clarificationQuestion">
        <div class="icon">⚠️</div>
        <div class="content">
          <div class="question">{{ clarificationQuestion }}</div>
          <div class="hint">Bitte wiederholen Sie Ihre Eingabe</div>
        </div>
        <button class="dismiss-btn" (click)="dismiss()" title="Schließen">✕</button>
      </div>

      <!-- Validierungsprobleme -->
      <div class="issues-banner" *ngIf="issues && issues.length > 0 && !clarificationQuestion">
        <div class="icon">ℹ️</div>
        <div class="content">
          <div class="title">Hinweis</div>
          <ul class="issues-list">
            <li *ngFor="let issue of issues">{{ issue }}</li>
          </ul>
        </div>
        <button class="dismiss-btn" (click)="dismiss()" title="Schließen">✕</button>
      </div>

      <!-- Konfidenz-Warnung -->
      <div class="confidence-banner" *ngIf="showConfidenceWarning && !clarificationQuestion && (!issues || issues.length === 0)">
        <div class="icon">🔊</div>
        <div class="content">
          <div class="message">Verstanden: "{{ lastTranscript }}"</div>
          <div class="hint">Niedrige Konfidenz - bitte bestätigen</div>
        </div>
        <button class="dismiss-btn" (click)="dismiss()" title="Schließen">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .speech-feedback {
      position: fixed;
      top: 80px; /* Unterhalb des Headers */
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      max-width: 600px;
      width: 90%;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    .clarification-banner,
    .issues-banner,
    .confidence-banner {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      background: white;
      border: 2px solid #f39c12;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      50% {
        box-shadow: 0 4px 25px rgba(243, 156, 18, 0.4);
      }
    }

    .clarification-banner {
      border-color: #e74c3c;
      background: #ffebee;
    }

    .issues-banner {
      border-color: #3498db;
      background: #e3f2fd;
    }

    .confidence-banner {
      border-color: #f39c12;
      background: #fff3cd;
    }

    .icon {
      font-size: 24px;
      line-height: 1;
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .question,
    .message,
    .title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
      font-size: 1em;
    }

    .hint {
      font-size: 0.85em;
      color: #666;
      font-style: italic;
    }

    .issues-list {
      margin: 5px 0 0 0;
      padding-left: 20px;
      font-size: 0.9em;
      color: #555;
    }

    .issues-list li {
      margin: 3px 0;
    }

    .dismiss-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .dismiss-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #333;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .speech-feedback {
        top: 70px;
        width: 95%;
      }

      .clarification-banner,
      .issues-banner,
      .confidence-banner {
        padding: 12px 15px;
        gap: 10px;
      }

      .icon {
        font-size: 20px;
      }

      .question,
      .message,
      .title {
        font-size: 0.95em;
      }

      .hint {
        font-size: 0.8em;
      }
    }
  `]
})
export class SpeechFeedbackComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  showFeedback = false;
  clarificationQuestion = '';
  issues: string[] = [];
  showConfidenceWarning = false;
  lastTranscript = '';

  private autoHideTimer?: number;

  constructor(private speechService: SpeechService) {}

  ngOnInit(): void {
    // Auf Validierungsergebnisse reagieren
    this.speechService.validationResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(validation => {
        this.handleValidationResult(validation);
      });

    // Auf Transkripte reagieren (für Konfidenz-Warnung)
    this.speechService.transcript$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result.isFinal) {
          this.lastTranscript = result.transcript;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoHideTimer();
  }

  private handleValidationResult(validation: ValidationResult): void {
    this.clearAutoHideTimer();

    // Klarstellungsfrage hat höchste Priorität
    if (validation.clarificationNeeded && validation.clarificationQuestion) {
      this.clarificationQuestion = validation.clarificationQuestion;
      this.issues = [];
      this.showConfidenceWarning = false;
      this.showFeedback = true;

      // Automatisch nach 15 Sekunden ausblenden (User kann ja sprechen)
      this.autoHideTimer = globalThis.setTimeout(() => {
        this.dismiss();
      }, 15000);
      return;
    }

    // Probleme anzeigen
    if (validation.issues && validation.issues.length > 0) {
      this.clarificationQuestion = '';
      this.issues = validation.issues;
      this.showConfidenceWarning = false;
      this.showFeedback = true;

      // Automatisch nach 8 Sekunden ausblenden
      this.autoHideTimer = globalThis.setTimeout(() => {
        this.dismiss();
      }, 8000);
      return;
    }

    // Niedrige Konfidenz warnen (nur wenn Validierung aktiv ist)
    if (validation.confidence < 0.7 && validation.hasAmbiguity && !validation.isValid) {
      this.clarificationQuestion = '';
      this.issues = [];
      this.showConfidenceWarning = true;
      this.showFeedback = true;

      // Automatisch nach 6 Sekunden ausblenden
      this.autoHideTimer = globalThis.setTimeout(() => {
        this.dismiss();
      }, 6000);
      return;
    }

    // Alles OK - nichts anzeigen
    this.dismiss();
  }

  dismiss(): void {
    this.showFeedback = false;
    this.clarificationQuestion = '';
    this.issues = [];
    this.showConfidenceWarning = false;
    this.speechService.clearClarification();
    this.clearAutoHideTimer();
  }

  private clearAutoHideTimer(): void {
    if (this.autoHideTimer) {
      globalThis.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = undefined;
    }
  }
}

