import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';

interface LlmConfig {
  url: string;
  model: string;
  useGpu: boolean;
  timeoutMs: number;
  targetLatencyMs: number;
  maxTokens: number;
  temperature: number;
  fallbackModel: string;
  confidenceShortcut: number;
  heuristicBypass: boolean;
}

interface Transcript {
  _id: string;
  userId: string;
  terminalId?: string;
  transcript: string;
  sttConfidence: number;
  aiAdjustedText?: string;
  suggestions?: string[];
  suggestionFlag: boolean;
  category: string;
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  durationMs: number;
  timings: {
    sttMs?: number;
    preProcessMs?: number;
    llmMs?: number;
    dbMs?: number;
    networkMs?: number;
  };
  model: string;
  llmProvider: string;
  fallbackUsed: boolean;
  error?: string;
  createdAt: string;
}

interface TranscriptsResponse {
  transcripts: Transcript[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface Stats {
  summary: {
    totalRequests: number;
    avgDuration: number;
    avgLlmTime: number;
    avgConfidence: number;
    validCount: number;
    fallbackCount: number;
  };
  byModel: Array<{
    _id: string;
    count: number;
    avgDuration: number;
    avgLlmTime: number;
  }>;
}

@Component({
  selector: 'app-admin-speech-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="admin-page">
      <div class="admin-shell">
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>mic</mat-icon>
              Sprachassistent Admin
            </mat-card-title>
            <mat-card-subtitle>
              LLM-Konfiguration, Performance-Monitoring und Anfrage-Log
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <mat-tab-group>
              <!-- Tab 1: Modelle & Konfiguration -->
              <mat-tab label="Modelle & Env">
                <div class="tab-content">
                  <h3>LLM Konfiguration</h3>

                  <div class="config-grid">
                    <mat-form-field>
                      <mat-label>LLM URL</mat-label>
                      <input matInput [(ngModel)]="config.url" placeholder="http://192.168.56.1:1234/v1/chat/completions">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Primäres Modell</mat-label>
                      <mat-select [(ngModel)]="config.model">
                        <mat-option value="mistralai/mistral-7b-instruct-v0.3">Mistral 7B Instruct v0.3</mat-option>
                        <mat-option value="meta-llama/llama-3.1-8b-instruct">LLaMA 3.1 8B Instruct</mat-option>
                        <mat-option value="meta-llama/llama-3.2-3b-instruct">LLaMA 3.2 3B Instruct (schnell)</mat-option>
                        <mat-option value="mistralai/mistral-nemo">Mistral Nemo 12B</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Fallback Modell (optional)</mat-label>
                      <input matInput [(ngModel)]="config.fallbackModel" placeholder="z.B. llama-3.2-3b-instruct">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Ziel-Latenz (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="config.targetLatencyMs" placeholder="2000">
                      <mat-hint>p90 Ziel für Performance-Monitoring</mat-hint>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="config.timeoutMs" placeholder="30000">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Max Tokens</mat-label>
                      <input matInput type="number" [(ngModel)]="config.maxTokens" placeholder="500">
                      <mat-hint>Kleiner = schneller</mat-hint>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Temperature</mat-label>
                      <input matInput type="number" step="0.1" [(ngModel)]="config.temperature" placeholder="0.3">
                      <mat-hint>0.1-0.5 empfohlen für strukturierte Outputs</mat-hint>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Confidence Shortcut</mat-label>
                      <input matInput type="number" step="0.05" [(ngModel)]="config.confidenceShortcut" placeholder="0.85">
                      <mat-hint>Bei STT-Confidence >= Wert → skip LLM</mat-hint>
                    </mat-form-field>
                  </div>

                  <div class="config-toggles">
                    <mat-slide-toggle [(ngModel)]="config.useGpu">
                      GPU verwenden (wenn verfügbar)
                    </mat-slide-toggle>

                    <mat-slide-toggle [(ngModel)]="config.heuristicBypass">
                      Heuristik-Bypass aktivieren
                      <span class="hint">Versucht LLM zu umgehen bei klaren Eingaben</span>
                    </mat-slide-toggle>
                  </div>

                  <div class="actions">
                    <button mat-raised-button color="primary" (click)="saveConfig()">
                      <mat-icon>save</mat-icon>
                      Speichern
                    </button>
                    <button mat-button (click)="loadConfig()">
                      <mat-icon>refresh</mat-icon>
                      Neu laden
                    </button>
                    <button mat-button color="warn" (click)="testConnection()">
                      <mat-icon>network_check</mat-icon>
                      Verbindung testen
                    </button>
                  </div>
                </div>
              </mat-tab>

              <!-- Tab 2: Statistics -->
              <mat-tab label="Statistiken">
                <div class="tab-content">
                  <h3>Performance Übersicht</h3>

                  <div class="stats-grid" *ngIf="stats">
                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Gesamt-Anfragen</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value">{{ stats.summary.totalRequests || 0 }}</div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Ø Latenz</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value">{{ (stats.summary.avgDuration || 0).toFixed(0) }} ms</div>
                        <div class="stat-hint" [class.warn]="stats.summary.avgDuration > config.targetLatencyMs">
                          Ziel: {{ config.targetLatencyMs }} ms
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Ø LLM Zeit</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value">{{ (stats.summary.avgLlmTime || 0).toFixed(0) }} ms</div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Ø Confidence</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value">{{ ((stats.summary.avgConfidence || 0) * 100).toFixed(1) }}%</div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Erfolgsrate</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value">
                          {{ ((stats.summary.validCount / stats.summary.totalRequests) * 100).toFixed(1) }}%
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="stat-card">
                      <mat-card-header>
                        <mat-card-title>Fallback genutzt</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="stat-value warn">{{ stats.summary.fallbackCount || 0 }}</div>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <h3>Performance nach Modell</h3>
                  <table mat-table [dataSource]="stats?.byModel || []" class="admin-table">
                    <ng-container matColumnDef="model">
                      <th mat-header-cell *matHeaderCellDef>Modell</th>
                      <td mat-cell *matCellDef="let row">{{ row._id }}</td>
                    </ng-container>

                    <ng-container matColumnDef="count">
                      <th mat-header-cell *matHeaderCellDef>Anfragen</th>
                      <td mat-cell *matCellDef="let row">{{ row.count }}</td>
                    </ng-container>

                    <ng-container matColumnDef="avgDuration">
                      <th mat-header-cell *matHeaderCellDef>Ø Latenz</th>
                      <td mat-cell *matCellDef="let row">{{ row.avgDuration.toFixed(0) }} ms</td>
                    </ng-container>

                    <ng-container matColumnDef="avgLlmTime">
                      <th mat-header-cell *matHeaderCellDef>Ø LLM Zeit</th>
                      <td mat-cell *matCellDef="let row">{{ row.avgLlmTime.toFixed(0) }} ms</td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="['model', 'count', 'avgDuration', 'avgLlmTime']"></tr>
                    <tr mat-row *matRowDef="let row; columns: ['model', 'count', 'avgDuration', 'avgLlmTime']"></tr>
                  </table>

                  <div class="actions">
                    <button mat-raised-button (click)="loadStats()">
                      <mat-icon>refresh</mat-icon>
                      Aktualisieren
                    </button>
                  </div>
                </div>
              </mat-tab>

              <!-- Tab 3: Anfragen -->
              <mat-tab label="Anfragen">
                <div class="tab-content">
                  <h3>Alle Sprach-Anfragen</h3>

                  <!-- Filter -->
                  <div class="filter-row">
                    <mat-form-field>
                      <mat-label>User ID</mat-label>
                      <input matInput [(ngModel)]="filter.userId" (input)="applyFilter()">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Terminal ID</mat-label>
                      <input matInput [(ngModel)]="filter.terminalId" (input)="applyFilter()">
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Modell</mat-label>
                      <mat-select [(ngModel)]="filter.model" (selectionChange)="applyFilter()">
                        <mat-option value="">Alle</mat-option>
                        <mat-option value="mistralai/mistral-7b-instruct-v0.3">Mistral 7B</mat-option>
                        <mat-option value="meta-llama/llama-3.1-8b-instruct">LLaMA 3.1 8B</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Kategorie</mat-label>
                      <mat-select [(ngModel)]="filter.category" (selectionChange)="applyFilter()">
                        <mat-option value="">Alle</mat-option>
                        <mat-option value="home_assistant_command">HA Command</mat-option>
                        <mat-option value="home_assistant_query">HA Query</mat-option>
                        <mat-option value="navigation">Navigation</mat-option>
                        <mat-option value="web_search">Web Search</mat-option>
                        <mat-option value="greeting">Greeting</mat-option>
                        <mat-option value="unknown">Unknown</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <button mat-button (click)="clearFilter()">
                      <mat-icon>clear</mat-icon>
                      Filter löschen
                    </button>
                  </div>

                  <!-- Table -->
                  <table mat-table [dataSource]="transcripts" class="admin-table">
                    <ng-container matColumnDef="createdAt">
                      <th mat-header-cell *matHeaderCellDef>Zeit</th>
                      <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'short' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="transcript">
                      <th mat-header-cell *matHeaderCellDef>Transkript</th>
                      <td mat-cell *matCellDef="let row" class="transcript-cell">
                        {{ row.transcript }}
                        <span class="confidence-badge">{{ (row.sttConfidence * 100).toFixed(0) }}%</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="category">
                      <th mat-header-cell *matHeaderCellDef>Kategorie</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="category-badge" [attr.data-category]="row.category">
                          {{ row.category }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="durationMs">
                      <th mat-header-cell *matHeaderCellDef>Latenz</th>
                      <td mat-cell *matCellDef="let row">
                        <span [class.warn]="row.durationMs > config.targetLatencyMs">
                          {{ row.durationMs }} ms
                        </span>
                        <br>
                        <small *ngIf="row.timings?.llmMs">LLM: {{ row.timings.llmMs }} ms</small>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="isValid">
                      <th mat-header-cell *matHeaderCellDef>Valid</th>
                      <td mat-cell *matCellDef="let row">
                        <mat-icon [class.valid]="row.isValid" [class.invalid]="!row.isValid">
                          {{ row.isValid ? 'check_circle' : 'cancel' }}
                        </mat-icon>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Aktionen</th>
                      <td mat-cell *matCellDef="let row">
                        <button mat-icon-button (click)="viewDetails(row)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="['createdAt', 'transcript', 'category', 'durationMs', 'isValid', 'actions']"></tr>
                    <tr mat-row *matRowDef="let row; columns: ['createdAt', 'transcript', 'category', 'durationMs', 'isValid', 'actions']"></tr>
                  </table>

                  <mat-paginator
                    [length]="pagination.total"
                    [pageSize]="pagination.limit"
                    [pageSizeOptions]="[10, 25, 50, 100]"
                    (page)="onPageChange($event)">
                  </mat-paginator>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      padding: 20px;
      min-height: 100vh;
    }

    .tab-content {
      padding: 24px 0;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .config-toggles {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      text-align: center;
    }

    .stat-value {
      font-size: 2.5em;
      font-weight: bold;
      color: var(--primary-color, #009688);
    }

    .stat-value.warn {
      color: var(--warn-color, #ff9800);
    }

    .stat-hint {
      font-size: 0.9em;
      color: #666;
      margin-top: 8px;
    }

    .stat-hint.warn {
      color: var(--warn-color, #ff9800);
      font-weight: bold;
    }

    .filter-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .transcript-cell {
      max-width: 300px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .confidence-badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(0, 150, 136, 0.2);
      border-radius: 12px;
      font-size: 0.85em;
      margin-left: 8px;
    }

    .category-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      background: rgba(0, 0, 0, 0.1);
    }

    .category-badge[data-category="home_assistant_command"] {
      background: rgba(33, 150, 243, 0.2);
      color: #2196f3;
    }

    .category-badge[data-category="greeting"] {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .warn {
      color: var(--warn-color, #ff9800);
      font-weight: bold;
    }

    mat-icon.valid {
      color: #4caf50;
    }

    mat-icon.invalid {
      color: #f44336;
    }

    .hint {
      display: block;
      font-size: 0.85em;
      color: #666;
      margin-top: 4px;
    }
  `]
})
export class AdminSpeechAssistantComponent implements OnInit {
  config: LlmConfig = {
    url: '',
    model: '',
    useGpu: true,
    timeoutMs: 30000,
    targetLatencyMs: 2000,
    maxTokens: 500,
    temperature: 0.3,
    fallbackModel: '',
    confidenceShortcut: 0.85,
    heuristicBypass: false
  };

  stats: Stats | null = null;
  transcripts: Transcript[] = [];
  pagination = {
    total: 0,
    page: 1,
    limit: 50,
    pages: 1
  };

  filter = {
    userId: '',
    terminalId: '',
    model: '',
    category: ''
  };

  // Use relative URL - will be proxied to backend
  private readonly backendUrl = '';

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadStats();
    this.loadTranscripts();
  }

  async loadConfig(): Promise<void> {
    try {
      this.config = await lastValueFrom(
        this.http.get<LlmConfig>(`${this.backendUrl}/api/llm-config`)
      );
      console.log('Loaded config:', this.config);
    } catch (error) {
      console.error('Failed to load config:', error);
      this.snackBar.open('Fehler beim Laden der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await lastValueFrom(
        this.http.post(`${this.backendUrl}/api/llm-config`, this.config)
      );
      this.snackBar.open('Konfiguration gespeichert', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Failed to save config:', error);
      this.snackBar.open('Fehler beim Speichern der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  async testConnection(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post(this.config.url.replace('/chat/completions', '/models'), {})
      );
      this.snackBar.open('Verbindung erfolgreich!', 'OK', { duration: 3000 });
      console.log('Connection test result:', response);
    } catch (error) {
      console.error('Connection test failed:', error);
      this.snackBar.open('Verbindung fehlgeschlagen!', 'OK', { duration: 5000 });
    }
  }

  async loadStats(): Promise<void> {
    try {
      this.stats = await lastValueFrom(
        this.http.get<Stats>(`${this.backendUrl}/api/transcripts/stats/summary`)
      );
      console.log('Loaded stats:', this.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async loadTranscripts(): Promise<void> {
    try {
      const params: any = {
        page: this.pagination.page,
        limit: this.pagination.limit
      };

      if (this.filter.userId) params.userId = this.filter.userId;
      if (this.filter.terminalId) params.terminalId = this.filter.terminalId;
      if (this.filter.model) params.model = this.filter.model;
      if (this.filter.category) params.category = this.filter.category;

      const response = await lastValueFrom(
        this.http.get<TranscriptsResponse>(`${this.backendUrl}/api/transcripts`, { params })
      );

      this.transcripts = response.transcripts;
      this.pagination = response.pagination;
      console.log('Loaded transcripts:', this.transcripts.length);
    } catch (error) {
      console.error('Failed to load transcripts:', error);
    }
  }

  applyFilter(): void {
    this.pagination.page = 1;
    this.loadTranscripts();
  }

  clearFilter(): void {
    this.filter = {
      userId: '',
      terminalId: '',
      model: '',
      category: ''
    };
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex + 1;
    this.pagination.limit = event.pageSize;
    this.loadTranscripts();
  }

  viewDetails(transcript: Transcript): void {
    console.log('View details:', transcript);
    // TODO: Open detail dialog
    alert(`Details:\n\n${JSON.stringify(transcript, null, 2)}`);
  }
}

