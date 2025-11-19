import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { lastValueFrom } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { LlmService } from '../../../core/services/llm.service';
import { TerminalService } from '../../../core/services/terminal.service';
import { Category } from '../../../core/models/category.model';
import { LlmInstance } from '../../../core/models/llm-instance.model';
import { ActionDialogComponent } from '../../../shared/components/action-dialog/action-dialog.component';

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
    MatSnackBarModule,
    MatCheckboxModule
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

  // New properties for extended functionality
  categories: Category[] = [];
  llmInstances: LlmInstance[] = [];
  terminals: any[] = [];
  selectedTranscripts: Record<string, boolean> = {};
  selectedModels: Record<string, boolean> = {};
  systemPrompt: string = '';
  activeInstanceId: string = '';
  bulkCategory: string = '';

  // Use relative URL - will be proxied to backend
  private readonly backendUrl = '';

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private categoryService: CategoryService,
    private llmService: LlmService,
    private terminalService: TerminalService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadConfig(),
      this.loadStats(),
      this.loadTranscripts(),
      this.loadCategories(),
      this.loadLlmInstances(),
      this.loadTerminals()
    ]);
    
    // Initialize selected models to true (all checked by default)
    if (this.stats?.byModel) {
      this.stats.byModel.forEach(model => {
        this.selectedModels[model._id] = true;
      });
    }
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
    
    // Format transcript details as HTML
    const detailsHtml = `
      <div class="transcript-details">
        <div class="detail-section">
          <h4>Transkript</h4>
          <p><strong>Original:</strong> ${transcript.transcript}</p>
          ${transcript.aiAdjustedText ? `<p><strong>AI-Korrigiert:</strong> ${transcript.aiAdjustedText}</p>` : ''}
          <p><strong>Confidence:</strong> ${(transcript.sttConfidence * 100).toFixed(1)}%</p>
        </div>
        
        <div class="detail-section">
          <h4>Klassifizierung</h4>
          <p><strong>Kategorie:</strong> ${transcript.category}</p>
          <p><strong>Valid:</strong> ${transcript.isValid ? 'Ja' : 'Nein'}</p>
          <p><strong>Confidence:</strong> ${(transcript.confidence * 100).toFixed(1)}%</p>
        </div>
        
        <div class="detail-section">
          <h4>Performance</h4>
          <p><strong>Gesamt:</strong> ${transcript.durationMs}ms</p>
          ${transcript.timings?.sttMs ? `<p><strong>STT:</strong> ${transcript.timings.sttMs}ms</p>` : ''}
          ${transcript.timings?.llmMs ? `<p><strong>LLM:</strong> ${transcript.timings.llmMs}ms</p>` : ''}
          ${transcript.timings?.dbMs ? `<p><strong>DB:</strong> ${transcript.timings.dbMs}ms</p>` : ''}
        </div>
        
        <div class="detail-section">
          <h4>Modell</h4>
          <p><strong>Modell:</strong> ${transcript.model}</p>
          <p><strong>Provider:</strong> ${transcript.llmProvider}</p>
          <p><strong>Fallback:</strong> ${transcript.fallbackUsed ? 'Ja' : 'Nein'}</p>
        </div>
        
        ${transcript.error ? `
          <div class="detail-section error">
            <h4>Fehler</h4>
            <p>${transcript.error}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    // Use MatDialog instead of alert
    const dialogRef = this.dialog.open(ActionDialogComponent, {
      width: '600px',
      data: {
        title: 'Transcript Details',
        content: detailsHtml,
        type: 'general'
      }
    });
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await this.categoryService.list();
      console.log('Loaded categories:', this.categories.length);
    } catch (error) {
      console.error('Failed to load categories:', error);
      this.snackBar.open('Fehler beim Laden der Kategorien', 'OK', { duration: 3000 });
    }
  }

  async loadLlmInstances(): Promise<void> {
    try {
      this.llmInstances = await this.llmService.listInstances();
      const activeInstance = this.llmInstances.find(i => i.isActive);
      if (activeInstance) {
        this.activeInstanceId = activeInstance._id || '';
        await this.loadSystemPrompt();
      }
      console.log('Loaded LLM instances:', this.llmInstances.length);
    } catch (error) {
      console.error('Failed to load LLM instances:', error);
      this.snackBar.open('Fehler beim Laden der LLM-Instanzen', 'OK', { duration: 3000 });
    }
  }

  async loadTerminals(): Promise<void> {
    try {
      const response = await this.terminalService.listTerminals();
      this.terminals = response.data || response.terminals || [];
      console.log('Loaded terminals:', this.terminals.length);
    } catch (error) {
      console.error('Failed to load terminals:', error);
      this.snackBar.open('Fehler beim Laden der Terminals', 'OK', { duration: 3000 });
    }
  }

  async loadSystemPrompt(): Promise<void> {
    if (!this.activeInstanceId) return;
    
    try {
      const response = await this.llmService.getSystemPrompt(this.activeInstanceId);
      this.systemPrompt = response.systemPrompt;
    } catch (error) {
      console.error('Failed to load system prompt:', error);
    }
  }

  async saveSystemPrompt(): Promise<void> {
    if (!this.activeInstanceId) {
      this.snackBar.open('Keine aktive LLM-Instanz ausgewählt', 'OK', { duration: 3000 });
      return;
    }
    
    try {
      await this.llmService.setSystemPrompt(this.activeInstanceId, this.systemPrompt);
      this.snackBar.open('System-Prompt gespeichert', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Failed to save system prompt:', error);
      this.snackBar.open('Fehler beim Speichern des System-Prompts', 'OK', { duration: 3000 });
    }
  }

  async activateLlm(id: string): Promise<void> {
    try {
      await this.llmService.activate(id);
      this.activeInstanceId = id;
      await this.loadLlmInstances();
      await this.loadSystemPrompt();
      this.snackBar.open('LLM-Instanz aktiviert', 'OK', { duration: 3000 });
    } catch (error: any) {
      console.error('Failed to activate LLM:', error);
      const message = error?.error?.error || 'Fehler beim Aktivieren der LLM-Instanz';
      this.snackBar.open(message, 'OK', { duration: 5000 });
    }
  }

  async testLlmConnection(id: string): Promise<void> {
    try {
      const response = await this.llmService.testConnection(id);
      if (response.success) {
        this.snackBar.open('Verbindung erfolgreich!', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Verbindung fehlgeschlagen!', 'OK', { duration: 5000 });
      }
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Connection test failed:', error);
      this.snackBar.open('Verbindungstest fehlgeschlagen!', 'OK', { duration: 5000 });
    }
  }

  async updateTranscriptCategory(id: string, category: string): Promise<void> {
    try {
      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${id}`, { category })
      );
      this.snackBar.open('Kategorie aktualisiert', 'OK', { duration: 2000 });
      await this.loadTranscripts();
    } catch (error) {
      console.error('Failed to update transcript category:', error);
      this.snackBar.open('Fehler beim Aktualisieren der Kategorie', 'OK', { duration: 3000 });
    }
  }

  async bulkUpdateCategories(): Promise<void> {
    const selectedIds = Object.keys(this.selectedTranscripts).filter(
      id => this.selectedTranscripts[id]
    );
    
    if (selectedIds.length === 0) {
      this.snackBar.open('Keine Transcripts ausgewählt', 'OK', { duration: 3000 });
      return;
    }
    
    if (!this.bulkCategory) {
      this.snackBar.open('Bitte Kategorie auswählen', 'OK', { duration: 3000 });
      return;
    }
    
    try {
      await lastValueFrom(
        this.http.post(`${this.backendUrl}/api/transcripts/bulk-update`, {
          ids: selectedIds,
          updates: { category: this.bulkCategory }
        })
      );
      
      this.snackBar.open(
        `${selectedIds.length} Transcripts aktualisiert`,
        'OK',
        { duration: 3000 }
      );
      
      // Clear selection
      this.selectedTranscripts = {};
      this.bulkCategory = '';
      await this.loadTranscripts();
    } catch (error) {
      console.error('Failed to bulk update categories:', error);
      this.snackBar.open('Fehler beim Bulk-Update', 'OK', { duration: 3000 });
    }
  }

  toggleSelectAll(checked: boolean): void {
    this.transcripts.forEach(t => {
      this.selectedTranscripts[t._id] = checked;
    });
  }

  toggleSelectAllModels(checked: boolean): void {
    if (this.stats?.byModel) {
      this.stats.byModel.forEach(model => {
        this.selectedModels[model._id] = checked;
      });
    }
  }

  get allTranscriptsSelected(): boolean {
    return this.transcripts.length > 0 && 
           this.transcripts.every(t => this.selectedTranscripts[t._id]);
  }

  get someTranscriptsSelected(): boolean {
    return this.transcripts.some(t => this.selectedTranscripts[t._id]) &&
           !this.allTranscriptsSelected;
  }

  get allModelsSelected(): boolean {
    if (!this.stats?.byModel || this.stats.byModel.length === 0) return false;
    return this.stats.byModel.every(m => this.selectedModels[m._id]);
  }

  get someModelsSelected(): boolean {
    if (!this.stats?.byModel) return false;
    return this.stats.byModel.some(m => this.selectedModels[m._id]) &&
           !this.allModelsSelected;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  close(): void {
    this.router.navigate(['/']);
  }

  getTerminalName(terminalId: string): string {
    const terminal = this.terminals.find(t => t.terminalId === terminalId || t._id === terminalId);
    return terminal ? `${terminal.name} (${terminal.terminalId || terminal._id})` : terminalId;
  }
}

