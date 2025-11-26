import { Component, OnInit, Inject } from '@angular/core';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { lastValueFrom } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { LlmService } from '../../../core/services/llm.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Category } from '../../../core/models/category.model';
import { LlmInstance } from '../../../core/models/llm-instance.model';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { resolveBackendBase } from '../../../core/utils/backend';
import { AdminGlobalConfigDialogComponent } from './admin-global-config-dialog.component';
import { AdminLlmConfigComponent } from './admin-llm-config.component';
import { AdminTranscriptEditDialogComponent } from './admin-transcript-edit-dialog.component';
import { FrontendLoggingService } from '../../../core/services/frontend-logging.service';

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
  systemPrompt?: string; // allow instance/system prompt to be attached to config
  // LM-Studio specific sampling fields
  topK?: number;
  topP?: number;
  repeatPenalty?: number;
  minPSampling?: number;
  // LM-Studio specific performance fields
  contextLength?: number;
  evalBatchSize?: number;
  cpuThreads?: number;
  gpuOffload?: boolean;
  keepModelInMemory?: boolean;
  flashAttention?: boolean;
  kCacheQuant?: boolean;
  vCacheQuant?: boolean;
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
    MatExpansionModule,
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
    AdminLlmConfigComponent,
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

  /** Aktiver Tab-Index, wird in der URL mitgeführt, damit Back/Reload den Tab erhalten */
  activeTabIndex = 0;

  /** Flag für Test-Button (Sprach-Test) – Implementierung folgt später */
  isTesting = false;

  // Use configured backend base URL (resolve localhost -> runtime hostname for LAN devices)
  private readonly backendUrl = resolveBackendBase(environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001');

  constructor(
    private readonly http: HttpClient,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly categoryService: CategoryService,
    private readonly llmService: LlmService,
    private readonly settings: SettingsService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    @Inject(FrontendLoggingService) private readonly frontendLogger: FrontendLoggingService
  ) {}

  openGlobalConfigDialog = async (): Promise<void> => {
    try {
      const dlg = this.dialog.open(AdminGlobalConfigDialogComponent, {
        width: '820px',
        panelClass: 'admin-global-config-dialog',
        disableClose: false,
        data: { config: this.config, models: Array.from(this.uniqueModels || []) }
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
    // Tab-Index aus QueryParams lesen (fallback 0)
    const tabFromUrl = Number(this.route.snapshot.queryParamMap.get('tab'));
    this.activeTabIndex = Number.isFinite(tabFromUrl) && tabFromUrl >= 0 ? tabFromUrl : 0;

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

  onTabChange(index: number): void {
    this.activeTabIndex = index;
    // Tab-Index in URL speichern, damit Back/Reload denselben Tab öffnet
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge'
    });
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
        heuristicBypass: cfg.heuristicBypass !== undefined ? cfg.heuristicBypass : false,
        // Erweiterte LM-Studio Sampling-Einstellungen
        topK: (cfg as any).topK ?? 40,
        topP: (cfg as any).topP ?? 0.95,
        repeatPenalty: (cfg as any).repeatPenalty ?? 1.0,
        minPSampling: (cfg as any).minPSampling ?? 0.05,
        contextLength: (cfg as any).contextLength ?? 4096,
        evalBatchSize: (cfg as any).evalBatchSize ?? 512,
        cpuThreads: (cfg as any).cpuThreads ?? 6,
        gpuOffload: (cfg as any).gpuOffload ?? false,
        keepModelInMemory: (cfg as any).keepModelInMemory ?? true,
        flashAttention: (cfg as any).flashAttention ?? false,
        kCacheQuant: (cfg as any).kCacheQuant ?? false,
        vCacheQuant: (cfg as any).vCacheQuant ?? false
      };
      console.log('Loaded config:', this.config);
      this.frontendLogger.info('AdminSpeech', 'Loaded config', { config: this.config });
      // After loading config, fetch models from the configured LLM and wait for completion
      await this.fetchModelsFromConfig();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.snackBar.open('Fehler beim Laden der Konfiguration', 'OK', { duration: 3000 });
    }
  }

  async saveInstanceConfig(): Promise<void> {
    if (!this.activeInstance?._id) {
      this.snackBar.open('Keine Instanz ausgewählt', 'OK', { duration: 3000 });
      return;
    }

    try {
      // Speichere instanz-spezifische Config mit autoReload
      const instanceConfig = {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        timeoutMs: this.config.timeoutMs,
        targetLatencyMs: this.config.targetLatencyMs,
        confidenceShortcut: this.config.confidenceShortcut,
        useGpu: this.config.useGpu,
        heuristicBypass: this.config.heuristicBypass,
        fallbackModel: this.config.fallbackModel,
        // Erweiterte LM-Studio-Einstellungen
        topK: (this.config as any).topK,
        topP: (this.config as any).topP,
        repeatPenalty: (this.config as any).repeatPenalty,
        minPSampling: (this.config as any).minPSampling,
        contextLength: (this.config as any).contextLength,
        evalBatchSize: (this.config as any).evalBatchSize,
        cpuThreads: (this.config as any).cpuThreads,
        gpuOffload: (this.config as any).gpuOffload,
        keepModelInMemory: (this.config as any).keepModelInMemory,
        flashAttention: (this.config as any).flashAttention,
        kCacheQuant: (this.config as any).kCacheQuant,
        vCacheQuant: (this.config as any).vCacheQuant,
        // AutoReload: true wenn Instanz aktiv ist, damit Änderungen sofort wirken
        autoReload: true
      };

      // Zeige Hinweis, dass Modell neu geladen wird
      const snackBarRef = this.snackBar.open(
        `💾 Speichere Konfiguration...${this.activeInstance.isActive ? ' Modell wird neu geladen...' : ''}`,
        '',
        { duration: 0 }
      );

      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/llm-instances/${this.activeInstance._id}/config`, instanceConfig)
      );

      // Speichere auch System-Prompt
      await this.saveSystemPrompt();

      snackBarRef.dismiss();

      if (this.activeInstance.isActive) {
        this.snackBar.open(
          `✅ Konfiguration gespeichert und Modell neu geladen!`,
          'OK',
          { duration: 5000 }
        );
      } else {
        this.snackBar.open(
          `Konfiguration für ${this.activeInstance.model} gespeichert`,
          'OK',
          { duration: 3000 }
        );
      }

      console.log(`Saved instance-specific config for ${this.activeInstance.model}:`, instanceConfig);
      this.frontendLogger.info('AdminSpeech', 'Saved instance-specific config', { instance: this.activeInstance?._id, model: this.activeInstance?.model, config: instanceConfig });

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
      this.frontendLogger.debug('AdminSpeech', 'fetchModelsFromConfig', { url: this.config.url, models });
      const set = new Set(this.uniqueModels || []);
      for (const m of models) set.add(m);
      this.uniqueModels = Array.from(set).sort();
      console.log('Fetched models from config url:', this.config.url, this.uniqueModels);
    } catch (e) {
      console.warn('Failed to fetch models from configured LLM:', e);
      this.frontendLogger.warn('AdminSpeech', 'Failed to fetch models from configured LLM (inner)', { url: this.config.url, error: e });
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

  async viewDetails(transcript: Transcript): Promise<void> {
    console.log('View details:', transcript);

    const dialogRef = this.dialog.open(AdminTranscriptEditDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { transcript },
      disableClose: false,
      panelClass: 'transcript-edit-dialog-container'
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      // Refresh transcripts after successful save
      await this.loadTranscripts();
    }
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

          // WICHTIG: Setze config.url und config.model, damit Test die richtige Instanz verwendet!
          this.config.url = instanceToLoad.url.replace('/v1/chat/completions', '');
          this.config.model = instanceToLoad.model;
          this.config.systemPrompt = this.systemPrompt;

          // Replace config reference so child OnChanges is triggered
          this.config = { ...this.config };
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
      this.frontendLogger.debug('AdminSpeech', 'Model discovery', { uniqueModels: this.uniqueModels, uniqueModelSources: this.uniqueModelSources });

      console.log('Loaded LLM instances:', this.llmInstances.length);
      this.frontendLogger.info('AdminSpeech', 'Finished populating model discovery', { instances: this.llmInstances.length });
    } catch (error) {
      console.error('Failed to load LLM instances:', error);
      this.frontendLogger.error('AdminSpeech', 'Failed to load LLM instances (outer)', error);
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
      this.frontendLogger.info('AdminSpeech', 'testLlmInstance result', { instanceId: instance._id, result });

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
      this.frontendLogger.error('AdminSpeech', 'Connection test failed', { instanceId: instance._id, error });
      this.snackBar.open('Verbindungstest fehlgeschlagen', 'OK', { duration: 3000 });
    }
  }

  async selectInstance(instance: LlmInstance | null): Promise<void> {
    console.log('[AdminSpeech] 🔵 selectInstance called with:', instance?.model || 'null');
    console.log('[AdminSpeech] 📋 Current config BEFORE select:', { url: this.config.url, model: this.config.model });

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

        // Erweiterte LM-Studio Sampling-Einstellungen
        (this.config as any).topK = instance.config.topK ?? 40;
        (this.config as any).topP = instance.config.topP ?? 0.95;
        (this.config as any).repeatPenalty = instance.config.repeatPenalty ?? 1.0;
        (this.config as any).minPSampling = instance.config.minPSampling ?? 0.05;
        (this.config as any).contextLength = instance.config.contextLength ?? 4096;
        (this.config as any).evalBatchSize = instance.config.evalBatchSize ?? 512;
        (this.config as any).cpuThreads = instance.config.cpuThreads ?? 6;
        (this.config as any).gpuOffload = instance.config.gpuOffload ?? false;
        (this.config as any).keepModelInMemory = instance.config.keepModelInMemory ?? true;
        (this.config as any).flashAttention = instance.config.flashAttention ?? false;
        (this.config as any).kCacheQuant = instance.config.kCacheQuant ?? false;
        (this.config as any).vCacheQuant = instance.config.vCacheQuant ?? false;
      }

      // URL und Model aus Instanz
      this.config.url = instance.url.replace('/v1/chat/completions', '');
      this.config.model = instance.model;
      // Ensure the instance's system prompt is passed to the test component
      this.config.systemPrompt = this.systemPrompt || this.config.systemPrompt;
      // Replace config reference to trigger OnChanges in AdminLlmConfigComponent
      this.config = { ...this.config };

      console.log('[AdminSpeech] ✅ selectInstance completed for:', instance.model);
      console.log('[AdminSpeech] 📋 Final config AFTER select:', {
        url: this.config.url,
        model: this.config.model,
        systemPrompt: this.config.systemPrompt?.substring(0, 50) + '...',
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
      this.frontendLogger.info('AdminSpeech', 'selectInstance completed', { instanceId: instance._id, model: instance.model, config: this.config });

      this.snackBar.open(`Konfiguration für ${instance.model} geladen`, 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Failed to load instance config:', error);
      this.frontendLogger.error('AdminSpeech', 'Failed to load instance config', { instanceId: instance._id, error });
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
      // Also keep config in sync so tests pick up the saved prompt immediately
      this.config.systemPrompt = this.systemPrompt;
      this.config = { ...this.config };
      this.snackBar.open(`System-Prompt für ${this.activeInstance.model} gespeichert`, 'OK', { duration: 3000 });
      console.log(`Saved system prompt for ${this.activeInstance.model}: ${this.systemPrompt.length} chars`);
      this.frontendLogger.info('AdminSpeech', 'Saved system prompt', { instance: this.activeInstance?._id, length: this.systemPrompt.length });
    } catch (error) {
      console.error('Failed to save system prompt:', error);
      this.frontendLogger.error('AdminSpeech', 'Failed to save system prompt', { instance: this.activeInstance?._id, error });
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

  // Übernehme die aktuell geladene Instanz-Konfiguration als globale Defaults
  async applyInstanceToGlobal(): Promise<void> {
    if (!this.activeInstance) {
      this.snackBar.open('Keine LLM-Instanz ausgewählt', 'OK', { duration: 3000 });
      return;
    }

    const confirmed = confirm(
      `Die Einstellungen von ${this.activeInstance.model} als globale Defaults für alle LLMs übernehmen?\n\n` +
      `Temperature: ${this.config.temperature}\nMax Tokens: ${this.config.maxTokens}\nConfidence: ${this.config.confidenceShortcut}\n\n` +
      `Fortfahren?`
    );

    if (!confirmed) return;

    try {
      const current = { ...(this.settings.current || {}) } as any;
      // Übertrage die instanz-spezifischen Werte in die globalen Einstellungen
      current.temperature = this.config.temperature;
      current.maxTokens = this.config.maxTokens;
      current.confidenceShortcut = this.config.confidenceShortcut;
      current.timeoutMs = this.config.timeoutMs;
      current.targetLatencyMs = this.config.targetLatencyMs;
      current.useGpu = this.config.useGpu;
      // Zusätzlich: erweiterte LM-Studio Einstellungen
      current.topK = (this.config as any).topK;
      current.topP = (this.config as any).topP;
      current.repeatPenalty = (this.config as any).repeatPenalty;
      current.minPSampling = (this.config as any).minPSampling;
      current.contextLength = (this.config as any).contextLength;
      current.evalBatchSize = (this.config as any).evalBatchSize;
      current.cpuThreads = (this.config as any).cpuThreads;
      current.gpuOffload = (this.config as any).gpuOffload;
      current.keepModelInMemory = (this.config as any).keepModelInMemory;
      current.flashAttention = (this.config as any).flashAttention;
      current.kCacheQuant = (this.config as any).kCacheQuant;
      current.vCacheQuant = (this.config as any).vCacheQuant;

      await lastValueFrom(this.settings.save(current));
      this.snackBar.open('LLM-Einstellungen als global übernommen', 'OK', { duration: 3000 });
      // reload global config and instances to reflect changes
      await this.loadConfig();
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to apply instance to global config:', error);
      this.snackBar.open('Fehler beim Übernehmen', 'OK', { duration: 3000 });
    }
  }

  // Helper to safely coerce values to numbers for the template
  num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
}
