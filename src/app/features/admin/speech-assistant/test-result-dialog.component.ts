import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

export interface TestResultData {
  transcript?: string;
  sttConfidence?: number;
  sttDurationMs?: number;
  sttProvider?: string;

  llmResult?: any;
  llmDurationMs?: number;
  llmConfidence?: number;
  llmModel?: string;

  intent?: any;
  category?: string;

  totalDurationMs?: number;
  error?: string;
  isLoading?: boolean;
}

@Component({
  selector: 'app-test-result-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <div class="test-result-dialog">
      <h2 mat-dialog-title>
        <mat-icon>science</mat-icon>
        LLM Test-Ergebnis
        <button mat-icon-button class="close-btn" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <div *ngIf="data.isLoading" class="loading-state">
          <mat-spinner diameter="60"></mat-spinner>
          <p>Verarbeite Anfrage...</p>
        </div>

        <div *ngIf="!data.isLoading && !data.error" class="result-content">
          <!-- Speech-to-Text Ergebnis -->
          <section class="result-section">
            <h3>
              <mat-icon>mic</mat-icon>
              Transkription (STT)
            </h3>
            <div class="result-card">
              <div class="transcript-text">"{{ data.transcript || 'Keine Transkription' }}"</div>
              <div class="metrics">
                <div class="metric">
                  <span class="label">Confidence:</span>
                  <span class="value" [class.high]="(data.sttConfidence || 0) >= 0.8"
                        [class.medium]="(data.sttConfidence || 0) >= 0.6 && (data.sttConfidence || 0) < 0.8"
                        [class.low]="(data.sttConfidence || 0) < 0.6">
                    {{ ((data.sttConfidence || 0) * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="metric">
                  <span class="label">Dauer:</span>
                  <span class="value">{{ data.sttDurationMs || 0 }} ms</span>
                </div>
                <div class="metric" *ngIf="data.sttProvider">
                  <span class="label">Provider:</span>
                  <span class="value">{{ data.sttProvider }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- LLM Verarbeitung -->
          <section class="result-section">
            <h3>
              <mat-icon>smart_toy</mat-icon>
              LLM-Analyse
            </h3>
            <div class="result-card">
              <div *ngIf="data.intent" class="intent-info">
                <div class="metric">
                  <span class="label">Intent:</span>
                  <span class="value intent-badge">{{ data.intent.intent || 'unknown' }}</span>
                </div>
                <div class="metric" *ngIf="data.category">
                  <span class="label">Kategorie:</span>
                  <span class="value">{{ data.category }}</span>
                </div>
                <div class="metric" *ngIf="data.llmConfidence !== undefined">
                  <span class="label">LLM Confidence:</span>
                  <span class="value" [class.high]="(data.llmConfidence || 0) >= 0.8"
                        [class.medium]="(data.llmConfidence || 0) >= 0.6 && (data.llmConfidence || 0) < 0.8"
                        [class.low]="(data.llmConfidence || 0) < 0.6">
                    {{ ((data.llmConfidence || 0) * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>

              <div *ngIf="data.llmResult" class="llm-response">
                <strong>LLM Antwort:</strong>
                <pre>{{ formatLLMResult(data.llmResult) }}</pre>
              </div>

              <div class="metrics">
                <div class="metric">
                  <span class="label">Verarbeitungszeit:</span>
                  <span class="value">{{ data.llmDurationMs || 0 }} ms</span>
                </div>
                <div class="metric" *ngIf="data.llmModel">
                  <span class="label">Modell:</span>
                  <span class="value model-name">{{ data.llmModel }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Gesamtstatistik -->
          <section class="result-section summary">
            <h3>
              <mat-icon>analytics</mat-icon>
              Zusammenfassung
            </h3>
            <div class="result-card summary-card">
              <div class="metric-large">
                <span class="label">Gesamtdauer:</span>
                <span class="value-large">{{ data.totalDurationMs || 0 }} ms</span>
              </div>
              <div class="breakdown">
                <div class="breakdown-item">
                  <span class="label">STT:</span>
                  <span class="value">{{ data.sttDurationMs || 0 }} ms</span>
                  <span class="percentage">({{ getPercentage(data.sttDurationMs, data.totalDurationMs) }}%)</span>
                </div>
                <div class="breakdown-item">
                  <span class="label">LLM:</span>
                  <span class="value">{{ data.llmDurationMs || 0 }} ms</span>
                  <span class="percentage">({{ getPercentage(data.llmDurationMs, data.totalDurationMs) }}%)</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div *ngIf="data.error" class="error-state">
          <mat-icon color="warn">error</mat-icon>
          <h3>Test fehlgeschlagen</h3>
          <p>{{ data.error }}</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Schließen</button>
        <button mat-raised-button color="primary" (click)="close()" *ngIf="!data.isLoading">
          <mat-icon>check</mat-icon>
          OK
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .test-result-dialog {
      min-width: 500px;
      max-width: 800px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      position: relative;
    }

    .close-btn {
      position: absolute;
      right: 8px;
      top: 8px;
    }

    mat-dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 20px;
    }

    .loading-state p {
      font-size: 1.1em;
      color: #666;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      text-align: center;
    }

    .error-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
    }

    .result-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .result-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      color: #333;
      font-size: 1.1em;
    }

    .result-card {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid #1976d2;
    }

    .transcript-text {
      font-size: 1.1em;
      font-style: italic;
      margin-bottom: 12px;
      color: #333;
      line-height: 1.5;
    }

    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 12px;
    }

    .metric {
      display: flex;
      gap: 8px;
      align-items: baseline;
    }

    .metric .label {
      font-size: 0.9em;
      color: #666;
      font-weight: 500;
    }

    .metric .value {
      font-size: 1em;
      color: #333;
      font-weight: 600;
    }

    .metric .value.high {
      color: #4caf50;
    }

    .metric .value.medium {
      color: #ff9800;
    }

    .metric .value.low {
      color: #f44336;
    }

    .intent-badge {
      background: #1976d2;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.9em;
    }

    .model-name {
      font-family: monospace;
      background: #e0e0e0;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .intent-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
    }

    .llm-response {
      margin-top: 12px;
    }

    .llm-response pre {
      background: white;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 8px 0 0 0;
      font-size: 0.9em;
      max-height: 200px;
      overflow-y: auto;
    }

    .summary-card {
      border-left-color: #4caf50;
    }

    .metric-large {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #ddd;
    }

    .metric-large .label {
      font-size: 1.1em;
      color: #666;
      font-weight: 600;
    }

    .value-large {
      font-size: 1.8em;
      color: #4caf50;
      font-weight: 700;
    }

    .breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .breakdown-item {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    .breakdown-item .label {
      min-width: 60px;
      color: #666;
      font-weight: 500;
    }

    .breakdown-item .value {
      font-weight: 600;
      color: #333;
    }

    .breakdown-item .percentage {
      color: #999;
      font-size: 0.9em;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 600px) {
      .test-result-dialog {
        min-width: unset;
        width: 100%;
      }

      .metrics {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class TestResultDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TestResultDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TestResultData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  formatLLMResult(result: any): string {
    if (!result) return 'Kein Ergebnis';
    if (typeof result === 'string') return result;
    return JSON.stringify(result, null, 2);
  }

  getPercentage(value?: number, total?: number): string {
    if (!value || !total || total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }
}

