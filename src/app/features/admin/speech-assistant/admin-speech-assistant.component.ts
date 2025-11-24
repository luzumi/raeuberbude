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
import { SettingsService } from '../../../core/services/settings.service';
import { Category } from '../../../core/models/category.model';
import { LlmInstance } from '../../../core/models/llm-instance.model';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { resolveBackendBase } from '../../../core/utils/backend';
import { AdminGlobalConfigDialogComponent } from './admin-global-config-dialog.component';

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
    MatCheckboxModule,

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
  uniqueModels: string[] = [];
  // Map modelId -> { instances: string[], active: boolean }
  uniqueModelSources: Record<string, { instances: string[]; active: boolean }> = {};
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
    private readonly settings: SettingsService,
    private readonly router: Router
  ) {}

  openGlobalConfigDialog = async (): Promise<void> => {
    try {
      const dlg = this.dialog.open(AdminGlobalConfigDialogComponent, {
        width: '820px',
        data: { config: this.config }
      });

      const res = await dlg.afterClosed().toPromise();
      if (res) {
        // refresh
        await this.loadConfig();
        await this.loadLlmInstances();
      }
    } catch (e) {
      console.error('Failed to open global config dialog', e);
    }
  }

  async ngOnInit(): Promise<void> {
    // Ensure config is loaded first so we can fetch models from configured LLM URL
    await this.loadConfig();
    await this.loadLlmInstances();
    // Load the rest
    await Promise.all([
      this.loadStats(),
      this.loadTranscripts(),
      this.loadCategories()
    ]);
  }

  async loadConfig(): Promise<void> {
    try {
      const cfg = await lastValueFrom(this.settings.load());
      // Map SettingsService config to component config
      this.config = {
        url: cfg.url || '',
        model: cfg.model || '',
        useGpu: cfg.useGpu !== undefined ? cfg.useGpu : true,
        timeoutMs: cfg.timeoutMs || 30000,
        targetLatencyMs: cfg.targetLatencyMs || 2000,
        maxTokens: cfg.maxTokens || 500,
        temperature: cfg.temperature !== undefined ? cfg.temperature : 0.3,
        fallbackModel: cfg.fallbackModel || '',
        confidenceShortcut: cfg.confidenceShortcut || 0.85,
        heuristicBypass: cfg.heuristicBypass !== undefined ? cfg.heuristicBypass : false
      };
      console.log('Loaded config:', this.config);
      // After loading config, fetch models from the configured LLM and wait for completion
      await this.fetchModelsFromConfig();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.snackBar.open('Fehler beim Laden der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  async saveConfig(): Promise<void> {
    // Wenn eine Instanz ausgewählt ist, speichere instanz-spezifisch
    if (this.activeInstance?._id) {
      await this.saveInstanceConfig();
      return;
    }

    // Ansonsten globale Config speichern
    try {
      await lastValueFrom(this.settings.save(this.config));
      const updated = this.settings.current;
      if (updated) {
        this.config = {
          url: updated.url || '',
          model: updated.model || '',
          useGpu: updated.useGpu !== undefined ? updated.useGpu : true,
          timeoutMs: updated.timeoutMs || 30000,
          targetLatencyMs: updated.targetLatencyMs || 2000,
          maxTokens: updated.maxTokens || 500,
          temperature: updated.temperature !== undefined ? updated.temperature : 0.3,
          fallbackModel: updated.fallbackModel || '',
          confidenceShortcut: updated.confidenceShortcut || 0.85,
          heuristicBypass: updated.heuristicBypass !== undefined ? updated.heuristicBypass : false
        };
      }
      this.snackBar.open('Globale Konfiguration gespeichert', 'OK', { duration: 3000 });
      await this.fetchModelsFromConfig();
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to save config:', error);
      this.snackBar.open('Fehler beim Speichern der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  /**
   * Speichere die aktuell angezeigte (evtl. instanz-spezifische) Konfiguration als globale Konfiguration
   * - Nützlich, wenn eine Instanz ausgewählt ist, du aber die Werte global übernehmen willst.
   */
  async saveGlobalFromActive(): Promise<void> {
    try {
      await lastValueFrom(this.settings.save(this.config));
      this.snackBar.open('Konfiguration global gespeichert', 'OK', { duration: 3000 });
      // Refresh settings and instances
      await this.loadConfig();
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to save global config from active instance:', error);
      this.snackBar.open('Fehler beim globalen Speichern', 'OK', { duration: 3000 });
    }
  }

  async saveInstanceConfig(): Promise<void> {
    if (!this.activeInstance?._id) {
      this.snackBar.open('Keine Instanz ausgewählt', 'OK', { duration: 3000 });
      return;
    }

    try {
      // Speichere instanz-spezifische Config
      const instanceConfig = {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        timeoutMs: this.config.timeoutMs,
        targetLatencyMs: this.config.targetLatencyMs,
        confidenceShortcut: this.config.confidenceShortcut,
        useGpu: this.config.useGpu,
        heuristicBypass: this.config.heuristicBypass,
        fallbackModel: this.config.fallbackModel
      };

      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/llm-instances/${this.activeInstance._id}/config`, instanceConfig)
      );

      // Speichere auch System-Prompt
      await this.saveSystemPrompt();

      this.snackBar.open(`Konfiguration für ${this.activeInstance.model} gespeichert`, 'OK', { duration: 3000 });
      console.log(`Saved instance-specific config for ${this.activeInstance.model}:`, instanceConfig);

      // Refresh instance list
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to save instance config:', error);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }

  /**
   * Fetch available models directly from configured LLM URL and merge into uniqueModels
   */
  private async fetchModelsFromConfig(): Promise<void> {
    if (!this.config || !this.config.url) return;
    try {
      const models = await lastValueFrom(this.llmService.getModels(this.config.url));
      const set = new Set(this.uniqueModels || []);
      for (const m of models) set.add(m);
      this.uniqueModels = Array.from(set).sort();
      console.log('Fetched models from config url:', this.config.url, this.uniqueModels);
    } catch (e) {
      console.warn('Failed to fetch models from configured LLM:', e);
    }
  }

  async testConnection(): Promise<void> {
    try {
      const models = await lastValueFrom(this.llmService.getModels(this.config.url));
      if (models && models.length > 0) {
        this.snackBar.open('Verbindung erfolgreich! ' + models.length + ' Modelle gefunden', 'OK', { duration: 3000 });
        console.log('Connection test result (models):', models);
      } else {
        this.snackBar.open('Verbindung hergestellt, aber keine Modelle gefunden', 'OK', { duration: 4000 });
        console.log('Connection test result: no models');
      }
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
      // Avoid cached 304 responses by adding a cache-buster on the backend call
      const ts = Date.now();
      this.llmInstances = await lastValueFrom(
        this.http.get<LlmInstance[]>(`${this.backendUrl}/api/llm-instances`, { params: { _t: String(ts) } })
      );
      this.activeInstance = this.llmInstances.find(i => i.isActive) || null;

      // Load system prompt of first active instance (or first instance if none active)
      const instanceToLoad = this.llmInstances.find(i => i.isActive) || this.llmInstances[0];
      if (instanceToLoad?._id) {
        try {
          const promptResult = await lastValueFrom(
            this.llmService.getSystemPrompt(instanceToLoad._id)
          );
          this.systemPrompt = promptResult.systemPrompt || '';
          this.activeInstance = instanceToLoad;
          console.log(`Loaded system prompt for instance: ${instanceToLoad.model}, length: ${this.systemPrompt.length}`);
        } catch (e) {
          console.warn('Failed to load system prompt:', e);
          this.systemPrompt = '';
        }
      } else {
        this.systemPrompt = '';
        this.activeInstance = null;
      }

      // Query each instance for available models and build unique set (merge with any models already from config)
      const modelSet = new Set<string>(this.uniqueModels || []);
      // reset sources map
      this.uniqueModelSources = {};
      for (const inst of this.llmInstances) {
        try {
          const models = await lastValueFrom(this.llmService.getModels(inst.url));
          console.log(`Models from instance ${inst.name || inst.url}:`, models);
          if (!models || models.length === 0) {
            console.warn(`No models returned from instance ${inst.name || inst.url}`);
          }
          for (const m of models || []) {
            modelSet.add(m);
            const entry = this.uniqueModelSources[m] || { instances: [], active: false };
            if (!entry.instances.includes(inst.name || inst.url)) entry.instances.push(inst.name || inst.url);
            // mark active true if instance is active
            entry.active = entry.active || !!inst.isActive;
            this.uniqueModelSources[m] = entry;
          }
          // also include the instance.model field if present
          if (inst.model) {
            modelSet.add(inst.model);
            const mm = inst.model;
            const entry = this.uniqueModelSources[mm] || { instances: [], active: false };
            if (!entry.instances.includes(inst.name || inst.url)) entry.instances.push(inst.name || inst.url);
            entry.active = entry.active || !!inst.isActive;
            this.uniqueModelSources[mm] = entry;
          }
        } catch (e) {
          // ignore individual instance failures
          console.warn(`Failed to fetch models from instance ${inst.name || inst.url}:`, e);
        }
      }
      this.uniqueModels = Array.from(modelSet).sort((a, b) => a.localeCompare(b));

      console.log('Unique models:', this.uniqueModels);
      console.log('Unique model sources:', this.uniqueModelSources);

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

  async loadLlmInstance(instance: LlmInstance): Promise<void> {
    if (!instance._id) return;

    try {
      const result = await lastValueFrom(this.llmService.load(instance._id));

      // Check if load was successful
      if (result.loadResult?.success) {
        this.snackBar.open(
          `✅ ${instance.model} geladen!`,
          'OK',
          { duration: 3000 }
        );
      } else if (result.loadResult?.error && result.loadResult.error.includes('not support')) {
        this.snackBar.open(
          `⚠️ ${instance.model} als aktiv markiert (LM Studio load API nicht verfügbar - Modell manuell laden)`,
          'OK',
          { duration: 5000 }
        );
      } else {
        this.snackBar.open(
          `${instance.model} geladen`,
          'OK',
          { duration: 3000 }
        );
      }

      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to load LLM instance:', error);
      this.snackBar.open('Laden fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async ejectLlmInstance(instance: LlmInstance): Promise<void> {
    if (!instance._id) return;

    // Bestätigungs-Dialog mit MCP-Eject-Hinweis
    const confirmed = confirm(
      `LLM-Modell "${instance.model}" entladen?\n\n` +
      `✅ Versucht das Modell aus LM Studio zu entladen (via MCP)\n` +
      `⚠️ Falls MCP-Eject nicht unterstützt wird: Manuell in LM Studio entladen\n\n` +
      `Fortfahren?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await lastValueFrom(this.llmService.eject(instance._id));

      // Check if eject was successful
      if (result.ejectResult?.success) {
        this.snackBar.open(
          `✅ ${instance.model} aus LM Studio entladen!`,
          'OK',
          { duration: 5000 }
        );
      } else if (result.ejectResult?.error) {
        const errorMsg = result.ejectResult.error.includes('not support')
          ? 'LM Studio API unterstützt Eject nicht - bitte manuell entladen'
          : result.ejectResult.error;
        this.snackBar.open(
          `⚠️ ${instance.model} als inaktiv markiert, aber Eject fehlgeschlagen: ${errorMsg}`,
          'OK',
          { duration: 8000 }
        );
      } else {
        this.snackBar.open(
          `${instance.model} als inaktiv markiert`,
          'OK',
          { duration: 5000 }
        );
      }

      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to eject LLM instance:', error);
      this.snackBar.open('Eject fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async testLlmInstance(instance: LlmInstance): Promise<void> {
    try {
      const result = await this.llmService.testConnection(instance);

      // result: { loaded: boolean, source?: string, details?: any }
      if (result.loaded) {
        this.snackBar.open(
          `Verbindungstest erfolgreich: Modell ist geladen (${result.source})`,
          'OK',
          { duration: 4000 }
        );
      } else {
        const reason = result.details?.error || (result.source === 'http' ? `HTTP ${result.details?.status || 'no response'}` : 'Modell nicht geladen');
        this.snackBar.open(
          `Verbindungstest fehlgeschlagen: ${reason}`,
          'OK',
          { duration: 6000 }
        );
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.snackBar.open('Verbindungstest fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async selectInstance(instance: LlmInstance | null): Promise<void> {
    // Wenn null übergeben wird, Auswahl aufheben und globale Config laden
    if (!instance) {
      this.activeInstance = null;
      await this.loadConfig();
      this.snackBar.open('Globale Konfiguration geladen', 'OK', { duration: 2000 });
      return;
    }

    if (!instance._id) return;

    try {
      // Lade System-Prompt
      const promptResult = await lastValueFrom(
        this.llmService.getSystemPrompt(instance._id)
      );
      this.systemPrompt = promptResult.systemPrompt || '';
      this.activeInstance = instance;

      // Lade instanz-spezifische Config-Werte in die Formular-Felder
      if (instance.config) {
        this.config.temperature = instance.config.temperature ?? 0.3;
        this.config.maxTokens = instance.config.maxTokens ?? 500;
        this.config.timeoutMs = instance.config.timeoutMs ?? 30000;
        this.config.targetLatencyMs = instance.config.targetLatencyMs ?? 2000;
        this.config.confidenceShortcut = instance.config.confidenceShortcut ?? 0.85;
        this.config.useGpu = instance.config.useGpu ?? true;
        this.config.heuristicBypass = instance.config.heuristicBypass ?? false;
        this.config.fallbackModel = instance.config.fallbackModel ?? '';
      }

      // URL und Model aus Instanz
      this.config.url = instance.url.replace('/v1/chat/completions', '');
      this.config.model = instance.model;

      console.log(`Loaded config for ${instance.model}:`, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        promptLength: this.systemPrompt.length
      });

      this.snackBar.open(`Konfiguration für ${instance.model} geladen`, 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Failed to load instance config:', error);
      this.snackBar.open('Fehler beim Laden der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  async saveSystemPrompt(): Promise<void> {
    if (!this.activeInstance || !this.activeInstance._id) {
      this.snackBar.open('Keine LLM-Instanz ausgewählt', 'OK', { duration: 3000 });
      return;
    }

    try {
      await lastValueFrom(
        this.llmService.setSystemPrompt(this.activeInstance._id, this.systemPrompt)
      );
      this.snackBar.open(`System-Prompt für ${this.activeInstance.model} gespeichert`, 'OK', { duration: 3000 });
      console.log(`Saved system prompt for ${this.activeInstance.model}: ${this.systemPrompt.length} chars`);
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
