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
  templateUrl: './admin-speech-assistant.component.html',
  styleUrls: ['./admin-speech-assistant.component.scss']
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

