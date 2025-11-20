import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
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
import { CategoryService } from '../../../core/services/category.service';
import { LlmService } from '../../../core/services/llm.service';
import { Category } from '../../../core/models/category.model';
import { LlmInstance } from '../../../core/models/llm-instance.model';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { resolveBackendBase } from '../../../core/utils/backend';

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

  // Neue Features
  categories: Category[] = [];
  llmInstances: LlmInstance[] = [];
  systemPrompt = '';
  activeInstance: LlmInstance | null = null;

  // Checkboxen für Statistiken
  selectedModels = new Set<string>();
  allModelsSelected = true;

  // Checkboxen für Transcripts
  selectedTranscripts = new Set<string>();
  bulkCategory = '';

  // Use configured backend base URL (resolve localhost -> runtime hostname for LAN devices)
  private readonly backendUrl = resolveBackendBase(environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001');

  constructor(
    private readonly http: HttpClient,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly categoryService: CategoryService,
    private readonly llmService: LlmService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadStats();
    this.loadTranscripts();
    this.loadCategories();
    this.loadLlmInstances();
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

      // Ensure numeric values for template safety
      const parseNum = (v: any): number => {
        if (v === undefined || v === null) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(',', '.');
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
      };

      if (this.stats && this.stats.summary) {
        this.stats.summary.totalRequests = parseNum(this.stats.summary.totalRequests) || 0;
        this.stats.summary.avgDuration = parseNum(this.stats.summary.avgDuration) || 0;
        this.stats.summary.avgLlmTime = parseNum(this.stats.summary.avgLlmTime) || 0;
        this.stats.summary.avgConfidence = parseNum(this.stats.summary.avgConfidence) || 0;
        this.stats.summary.validCount = parseNum(this.stats.summary.validCount) || 0;
        this.stats.summary.fallbackCount = parseNum(this.stats.summary.fallbackCount) || 0;
      }

      // Alle Modelle beim ersten Laden auswählen
      if (this.stats?.byModel) {
        for (const m of this.stats.byModel) {
          this.selectedModels.add(m._id);
          // Ensure numbers
          m.count = parseNum((m as any).count) || 0;
          (m as any).avgDuration = parseNum((m as any).avgDuration) || 0;
          (m as any).avgLlmTime = parseNum((m as any).avgLlmTime) || 0;
        }
        this.allModelsSelected = true;
      }

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

  // ===== Neue Methoden =====

  async loadCategories(): Promise<void> {
    try {
      this.categories = await lastValueFrom(this.categoryService.list());
      console.log('Loaded categories:', this.categories.length);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async loadLlmInstances(): Promise<void> {
    try {
      this.llmInstances = await lastValueFrom(this.llmService.listInstances());
      this.activeInstance = this.llmInstances.find(i => i.isActive) || null;

      if (this.activeInstance && this.activeInstance._id) {
        const promptResult = await lastValueFrom(
          this.llmService.getSystemPrompt(this.activeInstance._id)
        );
        this.systemPrompt = promptResult.systemPrompt;
      }

      console.log('Loaded LLM instances:', this.llmInstances.length);
    } catch (error) {
      console.error('Failed to load LLM instances:', error);
    }
  }

  async scanLlmInstances(): Promise<void> {
    try {
      this.llmInstances = await lastValueFrom(this.llmService.scan());
      this.snackBar.open('LLM-Instanzen gescannt', 'OK', { duration: 3000 });
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to scan LLM instances:', error);
      this.snackBar.open('Fehler beim Scannen', 'OK', { duration: 3000 });
    }
  }

  async cleanupDuplicates(): Promise<void> {
    try {
      const result: any = await lastValueFrom(
        this.http.post(`${this.backendUrl}/api/llm-instances/cleanup`, {})
      );
      this.snackBar.open(
        `${result.deleted} Duplikate entfernt`,
        'OK',
        { duration: 3000 }
      );
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to cleanup duplicates:', error);
      this.snackBar.open('Fehler beim Bereinigen', 'OK', { duration: 3000 });
    }
  }

  async activateLlmInstance(instance: LlmInstance): Promise<void> {
    if (!instance._id) return;

    try {
      await lastValueFrom(this.llmService.activate(instance._id));
      this.snackBar.open('LLM-Instanz aktiviert', 'OK', { duration: 3000 });
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to activate LLM instance:', error);
      this.snackBar.open('Aktivierung fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async testLlmInstance(instance: LlmInstance): Promise<void> {
    try {
      const success = await this.llmService.testConnection(instance);
      if (success) {
        this.snackBar.open('Verbindungstest erfolgreich!', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Verbindungstest fehlgeschlagen', 'OK', { duration: 3000 });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.snackBar.open('Verbindungstest fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async saveSystemPrompt(): Promise<void> {
    if (!this.activeInstance || !this.activeInstance._id) {
      this.snackBar.open('Keine aktive LLM-Instanz', 'OK', { duration: 3000 });
      return;
    }

    try {
      await lastValueFrom(
        this.llmService.setSystemPrompt(this.activeInstance._id, this.systemPrompt)
      );
      this.snackBar.open('System-Prompt gespeichert', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Failed to save system prompt:', error);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }

  // Modell-Checkboxen (Statistiken)
  toggleAllModels(): void {
    if (this.allModelsSelected) {
      this.selectedModels.clear();
      this.allModelsSelected = false;
    } else {
      if (this.stats?.byModel) {
        for (const m of this.stats.byModel) {
          this.selectedModels.add(m._id);
        }
      }
      this.allModelsSelected = true;
    }
  }

  toggleModel(modelId: string): void {
    if (this.selectedModels.has(modelId)) {
      this.selectedModels.delete(modelId);
    } else {
      this.selectedModels.add(modelId);
    }
    this.allModelsSelected = this.selectedModels.size === this.stats?.byModel.length;
  }

  isModelSelected(modelId: string): boolean {
    return this.selectedModels.has(modelId);
  }

  get filteredModelStats() {
    if (!this.stats) return [];
    // Defensive copy and coercion to numbers to prevent template errors
    const list = (this.stats.byModel || []).map(m => ({
      _id: m._id,
      count: Number(m.count) || 0,
      avgDuration: Number((m as any).avgDuration) || 0,
      avgLlmTime: Number((m as any).avgLlmTime) || 0
    }));

    if (this.selectedModels.size === 0) return list;
    return list.filter(m => this.selectedModels.has(m._id));
  }

  // Transcript-Checkboxen
  toggleAllTranscripts(): void {
    if (this.selectedTranscripts.size === this.transcripts.length) {
      this.selectedTranscripts.clear();
    } else {
      for (const t of this.transcripts) {
        this.selectedTranscripts.add(t._id);
      }
    }
  }

  toggleTranscript(transcriptId: string): void {
    if (this.selectedTranscripts.has(transcriptId)) {
      this.selectedTranscripts.delete(transcriptId);
    } else {
      this.selectedTranscripts.add(transcriptId);
    }
  }

  isTranscriptSelected(transcriptId: string): boolean {
    return this.selectedTranscripts.has(transcriptId);
  }

  get allTranscriptsSelected(): boolean {
    return this.transcripts.length > 0 &&
           this.selectedTranscripts.size === this.transcripts.length;
  }

  // Inline Kategorie-Update
  async updateTranscriptCategory(transcript: Transcript, newCategory: string): Promise<void> {
    try {
      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${transcript._id}`, {
          category: newCategory
        })
      );
      transcript.category = newCategory;
      this.snackBar.open('Kategorie aktualisiert', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Failed to update transcript category:', error);
      this.snackBar.open('Fehler beim Aktualisieren', 'OK', { duration: 3000 });
    }
  }

  // Bulk-Update
  async applyBulkCategory(): Promise<void> {
    if (!this.bulkCategory || this.selectedTranscripts.size === 0) {
      this.snackBar.open('Bitte Kategorie und Transcripts auswählen', 'OK', { duration: 3000 });
      return;
    }

    try {
      const ids = Array.from(this.selectedTranscripts);
      await lastValueFrom(
        this.http.post(`${this.backendUrl}/api/transcripts/bulk-update`, {
          ids,
          updates: { category: this.bulkCategory }
        })
      );

      this.snackBar.open(`${ids.length} Transcripts aktualisiert`, 'OK', { duration: 3000 });
      this.selectedTranscripts.clear();
      this.bulkCategory = '';
      await this.loadTranscripts();
    } catch (error) {
      console.error('Failed to bulk update:', error);
      this.snackBar.open('Fehler beim Bulk-Update', 'OK', { duration: 3000 });
    }
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/admin']);
  }

  closeView(): void {
    this.router.navigate(['/']);
  }

  // Helper to safely coerce values to numbers for the template
  num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
}
