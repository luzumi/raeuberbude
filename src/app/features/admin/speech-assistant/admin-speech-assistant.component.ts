import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, transition, animate } from '@angular/animations';
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
import { MatTooltipModule } from '@angular/material/tooltip';
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
import { TranscriptAssignmentFormComponent } from './transcript-assignment-form.component';
import { FrontendLoggingService } from '../../../core/services/frontend-logging.service';
import { Transcript } from './transcript.model';
import { AdminLlmLoadDialogComponent, LlmLoadRoleChoice } from './admin-llm-load-dialog.component';

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


interface TranscriptsResponse {
  // Legacy shape
  transcripts?: Transcript[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  // Nest/current shape
  data?: Transcript[];
  total?: number;
  page?: number;
  limit?: number;
}

interface Stats {
  // legacy shape
  summary?: {
    totalRequests: number;
    avgDuration: number;
    avgLlmTime: number;
    avgConfidence: number;
    validCount: number;
    fallbackCount: number;
  };
  byModel?: Array<{
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
    MatTooltipModule,
    AdminLlmConfigComponent,
    TranscriptAssignmentFormComponent,
  ],
  templateUrl: './admin-speech-assistant.component.html',
  styleUrls: ['./admin-speech-assistant.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
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

  // Expandable rows for inline editing
  expandedElement: Transcript | null = null;
  isSavingTranscriptId: string | null = null;

  // Track recently updated transcripts to show green
  recentlyUpdated = new Set<string>();

  /** Aktiver Tab-Index, wird in der URL mitgeführt, damit Back/Reload den Tab erhalten */
  activeTabIndex = 0;

  /** Flag für Test-Button (Sprach-Test) – Implementierung folgt später */
  isTesting = false;

  /** UI-Guard, damit der Cleanup nicht parallel mehrfach gestartet wird */
  isCleaningDuplicates = false;

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

  ngOnInit(): void {
    // Tab-Index aus QueryParams lesen (fallback 0)
    const tabFromUrl = Number(this.route.snapshot.queryParamMap.get('tab'));
    this.activeTabIndex = Number.isFinite(tabFromUrl) && tabFromUrl >= 0 ? tabFromUrl : 0;

    // Asynchrone Initialisierung starten
    this.initializeComponent().then((r) => {
      console.log('Component initialized', r);
    });
  }

  private async initializeComponent(): Promise<void> {
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
        useGpu: cfg.useGpu ?? true,
        timeoutMs: cfg.timeoutMs || 30000,
        targetLatencyMs: cfg.targetLatencyMs || 2000,
        maxTokens: cfg.maxTokens || 500,
        temperature: cfg.temperature ?? 0.3,
        fallbackModel: cfg.fallbackModel || '',
        confidenceShortcut: cfg.confidenceShortcut || 0.85,
        heuristicBypass: cfg.heuristicBypass ?? false,
        // Erweiterte LM-Studio Sampling-Einstellungen
        topK: (cfg as any).topK ?? 40,
        topP: (cfg as any).topP ?? 0.95,
        repeatPenalty: (cfg as any).repeatPenalty ?? 1,
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
    if (!this.config?.url) return;
    try {
      const models = await lastValueFrom(this.llmService.getModels(this.config.url));
      this.frontendLogger.debug('AdminSpeech', 'fetchModelsFromConfig', { url: this.config.url, models });
      const set = new Set(this.uniqueModels || []);
      for (const m of models) set.add(m);

      this.uniqueModels = Array.from(set).map(m => String(m)).sort((a, b) => a.localeCompare(b));

      console.log('Fetched models from config url:', this.config.url, this.uniqueModels);
    } catch (e) {
      console.warn('Failed to fetch models from configured LLM:', e);
      this.frontendLogger.warn('AdminSpeech', 'Failed to fetch models from configured LLM (inner)', { url: this.config.url, error: e });
    }
  }

  async loadStats(): Promise<void> {
    try {
      const raw: any = await lastValueFrom(
        this.http.get<any>(`${this.backendUrl}/api/transcripts/stats/summary`)
      );

      // Backend currently may return [] (not implemented) or a Stats object.
      if (Array.isArray(raw)) {
        this.stats = {
          summary: {
            totalRequests: 0,
            avgDuration: 0,
            avgLlmTime: 0,
            avgConfidence: 0,
            validCount: 0,
            fallbackCount: 0,
          },
          byModel: [],
        };
      } else {
        this.stats = raw as Stats;
      }

      // Ensure numeric values for template safety
      const parseNum = (v: any): number => {
        if (v === undefined || v === null) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(',', '.');
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
      };

      if (!this.stats) {
        this.stats = {
          summary: {
            totalRequests: 0,
            avgDuration: 0,
            avgLlmTime: 0,
            avgConfidence: 0,
            validCount: 0,
            fallbackCount: 0,
          },
          byModel: [],
        };
      }

      // Normalize missing fields
      this.stats.summary = this.stats.summary || {
        totalRequests: 0,
        avgDuration: 0,
        avgLlmTime: 0,
        avgConfidence: 0,
        validCount: 0,
        fallbackCount: 0,
      };
      this.stats.byModel = this.stats.byModel || [];

      this.stats.summary.totalRequests = parseNum(this.stats.summary.totalRequests) || 0;
      this.stats.summary.avgDuration = parseNum(this.stats.summary.avgDuration) || 0;
      this.stats.summary.avgLlmTime = parseNum(this.stats.summary.avgLlmTime) || 0;
      this.stats.summary.avgConfidence = parseNum(this.stats.summary.avgConfidence) || 0;
      this.stats.summary.validCount = parseNum(this.stats.summary.validCount) || 0;
      this.stats.summary.fallbackCount = parseNum(this.stats.summary.fallbackCount) || 0;

      // Alle Modelle beim ersten Laden auswählen
      if (this.stats.byModel) {
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

      // Support both legacy and current backend shapes
      const list = (response as any).transcripts ?? (response as any).data ?? [];
      this.transcripts = Array.isArray(list) ? list : [];

      const total = (response as any).pagination?.total ?? (response as any).total ?? 0;
      const page = (response as any).pagination?.page ?? (response as any).page ?? this.pagination.page;
      const limit = (response as any).pagination?.limit ?? (response as any).limit ?? this.pagination.limit;
      const pages = (response as any).pagination?.pages ?? (limit ? Math.max(1, Math.ceil(total / limit)) : 1);

      this.pagination = { total, page, limit, pages };
       console.log('Loaded transcripts:', this.transcripts.length);

       // Keep recentlyUpdated but remove ids that are no longer in the loaded page
       const loadedIds = new Set(this.transcripts.map(t => t._id));
       this.recentlyUpdated = new Set(Array.from(this.recentlyUpdated).filter(id => loadedIds.has(id)));

       // Close expanded element after loading
       this.expandedElement = null;
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
      // If dialog returned an id, mark it as recently updated and refresh list
      if (typeof result === 'string') {
        this.recentlyUpdated.add(result);
      }
      await this.loadTranscripts();
    }
  }

  async deleteTranscript(transcript: Transcript): Promise<void> {
    const confirmed = confirm(
      `Transkript wirklich löschen?\n\n` +
      `Text: "${transcript.transcript.substring(0, 50)}${transcript.transcript.length > 50 ? '...' : ''}"\n` +
      `Kategorie: ${transcript.category || 'Keine'}\n` +
      `Erstellt: ${new Date(transcript.createdAt).toLocaleString()}\n\n` +
      `Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    try {
      await lastValueFrom(
        this.http.delete(`${this.backendUrl}/api/transcripts/${transcript._id}`, { withCredentials: true })
      );

      this.snackBar.open('Transkript erfolgreich gelöscht', 'OK', { duration: 3000 });

      // Remove from local array to avoid reload
      this.transcripts = this.transcripts.filter(t => t._id !== transcript._id);

      // Update pagination count
      this.pagination.total = Math.max(0, this.pagination.total - 1);

      // Remove from selected if selected
      this.selectedTranscripts.delete(transcript._id);

      console.log('Deleted transcript:', transcript._id);
    } catch (error) {
      console.error('Failed to delete transcript:', error);
      this.snackBar.open('Fehler beim Löschen des Transkripts', 'Schließen', {
        duration: 5000,
        panelClass: 'snackbar-error'
      });
    }
  }

  async setTranscriptValid(transcript: Transcript): Promise<void> {
    // Wenn bereits als gültig markiert, nichts tun
    if (transcript.manuallyValid) {
      // TODO: Details anbieten zum Aufheben und anpassen des Transkripts
      this.snackBar.open('Transkript ist bereits als gültig markiert', 'OK', { duration: 2000 });
      return;
    }

    try {
      // Update in Backend
      const updated = await lastValueFrom(
        this.http.put<Transcript>(
          `${this.backendUrl}/api/transcripts/${transcript._id}`,
          { manuallyValid: true },
          { withCredentials: true }
        )
      );
      console.log('Updated transcript:', updated);

      // Update local state
      transcript.manuallyValid = true;

      // Add to recently updated to show green highlight
      this.recentlyUpdated.add(transcript._id);

      this.snackBar.open('✅ Transkript als gültig markiert', 'OK', { duration: 3000 });

      console.log('Set transcript as valid:', transcript._id);
    } catch (error) {
      console.error('Failed to set transcript as valid:', error);
      this.snackBar.open('Fehler beim Markieren als gültig', 'Schließen', {
        duration: 5000,
        panelClass: 'snackbar-error'
      });
    }
  }

  // ===== Neue Methoden =====

  /**
   * Lädt den System-Prompt für eine Instanz und setzt UI-State.
   * Robust gegen fehlende IDs (Backend kann id statt _id liefern).
   */
  private async loadSystemPromptFor(instance?: LlmInstance): Promise<void> {
    if (!instance) {
      this.systemPrompt = '';
      return;
    }

    const id = (instance as any)._id || (instance as any).id;
    if (!id) {
      this.systemPrompt = '';
      return;
    }

    // für UI/Editor: aktive Instanz setzen, falls sinnvoll
    this.activeInstance = instance;

    try {
      const promptResult = await lastValueFrom(this.llmService.getSystemPrompt(id));
      this.systemPrompt = String(promptResult?.systemPrompt ?? '');
    } catch (e) {
      console.warn('Failed to load system prompt for instance', { id, e });
      this.systemPrompt = '';
    }
  }

  private getLlmInstanceId(inst: LlmInstance): string {
    return String((inst as any)._id || (inst as any).id || inst.model || 'unknown');
  }

  private normalizeModelKey(modelId: unknown): string {
    return String(modelId || '').trim();
  }

  private upsertModelSource(
    sourcesByModel: Record<string, { instances: string[]; active: boolean }>,
    modelId: string,
    instId: string,
    isActive: boolean,
  ): void {
    const key = this.normalizeModelKey(modelId);
    if (!key) return;

    if (!sourcesByModel[key]) {
      sourcesByModel[key] = { instances: [], active: false };
    }

    const entry = sourcesByModel[key];
    if (!entry.instances.includes(instId)) {
      entry.instances.push(instId);
    }
    entry.active = entry.active || isActive;
  }

  private async fetchModelsFromInstanceUrl(url: unknown): Promise<string[]> {
    if (!url) return [];
    try {
      const models = await lastValueFrom(this.llmService.getModels(String(url)));
      if (!Array.isArray(models) || models.length === 0) return [];
      return models.map(m => this.normalizeModelKey(m)).filter(Boolean);
    } catch (e) {
      console.warn('Model discovery failed for instance', { url, e });
      return [];
    }
  }

  /**
   * Entdeckt verfügbare Modelle aus allen Instanzen.
   * Nutzt primär `/v1/models` via `LlmService.getModels()`, fällt aber auf `instance.model` zurück.
   */
  private async discoverModels(instances: LlmInstance[]): Promise<{
    modelSet: Set<string>;
    sourcesByModel: Record<string, { instances: string[]; active: boolean }>;
  }> {
    const modelSet = new Set<string>();
    const sourcesByModel: Record<string, { instances: string[]; active: boolean }> = {};

    const list = Array.isArray(instances) ? instances : [];
    for (const inst of list) {
      const instId = this.getLlmInstanceId(inst);
      const isActive = !!(inst as any).isActive;
      const url = (inst as any).url;

      const fallbackModel = this.normalizeModelKey((inst as any).model);
      if (fallbackModel) {
        modelSet.add(fallbackModel);
        this.upsertModelSource(sourcesByModel, fallbackModel, instId, isActive);
      }

      const discovered = await this.fetchModelsFromInstanceUrl(url);
      for (const m of discovered) {
        modelSet.add(m);
        this.upsertModelSource(sourcesByModel, m, instId, isActive);
      }
    }

    // Stabil sortieren für UI
    for (const key of Object.keys(sourcesByModel)) {
      sourcesByModel[key].instances = Array.from(new Set(sourcesByModel[key].instances)).sort((a, b) => a.localeCompare(b));
    }

    return { modelSet, sourcesByModel };
  }

  newCategory: { key: string; label: string } = { key: '', label: '' };

  async loadCategories(): Promise<void> {
    try {
      const raw = await lastValueFrom(this.categoryService.list());
      // Backend (TypeORM) uses `id`, frontend model uses `_id`
      this.categories = (raw || []).map((c: any) => ({
        ...c,
        _id: c._id || c.id,
      }));
      console.log('Loaded categories:', this.categories.length);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async createCategory(): Promise<void> {
    const key = String(this.newCategory.key || '').trim();
    const label = String(this.newCategory.label || '').trim();
    if (!key || !label) {
      this.snackBar.open('Bitte Key und Label angeben', 'OK', { duration: 3000 });
      return;
    }

    try {
      await lastValueFrom(this.categoryService.create({ key, label } as any));
      this.snackBar.open('Kategorie gespeichert', 'OK', { duration: 2500 });
      this.newCategory = { key: '', label: '' };
      await this.loadCategories();
    } catch (e) {
      console.error('Failed to create category', e);
      this.snackBar.open('Fehler beim Erstellen der Kategorie', 'OK', { duration: 4000 });
    }
  }

  /** Drift = DB-Status (isActive) weicht vom echten LM-Studio-Status ab */
  hasStatusDrift(inst: LlmInstance): boolean {
    if (!inst) return false;
    if (inst.loadedInLmStudio === undefined || inst.loadedInLmStudio === null) return false;
    return (inst.isActive !== inst.loadedInLmStudio);
  }

  async loadLlmInstances(): Promise<void> {
    try {
      // Avoid cached 304 responses by adding a cache-buster on the backend call
      const ts = Date.now();
      const raw = await lastValueFrom(
        this.http.get<LlmInstance[]>(`${this.backendUrl}/api/llm-instances`, { params: { _t: String(ts) } })
      );

      // Normalize ids/roles defensively (backend may return id instead of _id)
      this.llmInstances = (raw || []).map((i: any) => ({
        ...i,
        _id: i._id || i.id,
        role: this.normalizeRole(i.role),
        loadedInLmStudio: undefined,
      }));

      // Runtime-Status aus LM Studio holen (per Backend /model-status via testConnection)
      await Promise.all(
        (this.llmInstances || []).map(async (inst) => {
          try {
            // Skip disabled instances (optional): zeigt als unbekannt
            if (!inst.enabled) {
              inst.loadedInLmStudio = undefined;
              return;
            }
            const res = await this.llmService.testConnection(inst);
            inst.loadedInLmStudio = !!res.loaded;
          } catch {
            inst.loadedInLmStudio = undefined;
          }
        })
      );

      this.activeInstance = this.llmInstances.find(i => i.isActive) || null;

      // Lade System-Prompt für die aktive oder erste Instanz
      const instanceToLoad = this.llmInstances.find(i => i.isActive) || this.llmInstances[0];
      await this.loadSystemPromptFor(instanceToLoad);

      // Entdecke Modelle aus allen Instanzen
      const { modelSet, sourcesByModel } = await this.discoverModels(this.llmInstances);
      this.uniqueModelSources = sourcesByModel;
      this.uniqueModels = Array.from(modelSet).map(String).sort((a, b) => a.localeCompare(b));

      console.log('Loaded LLM instances:', this.llmInstances.length);
      this.frontendLogger.info('AdminSpeech', 'Finished populating model discovery', { instances: this.llmInstances.length });
    } catch (error) {
      console.error('Failed to load LLM instances:', error);
      this.frontendLogger.error('AdminSpeech', 'Failed to load LLM instances (outer)', error);
    }
  }

  /** Rollen konsistent normalisieren */
  private normalizeRole(role: any): 'primary' | 'secondary' | 'other' {
    const r = String(role || '').toLowerCase();
    if (r === 'primary') return 'primary';
    if (r === 'secondary') return 'secondary';
    return 'other';
  }

  async scanLlmInstances(): Promise<void> {
    try {
      await lastValueFrom(this.llmService.scan());
      // Wichtig: Scan setzt isActive/health nur initial. Danach unbedingt mit LM Studio syncen.
      await lastValueFrom(this.llmService.syncActive());

      this.snackBar.open('LLM-Instanzen gescannt', 'OK', { duration: 3000 });
      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to scan LLM instances:', error);
      this.snackBar.open('Fehler beim Scannen', 'OK', { duration: 3000 });
    }
  }

  private async enforceExclusiveRole(targetId: string, role: 'primary' | 'secondary'): Promise<void> {
    // set all other instances with same role -> other
    const others = (this.llmInstances || []).filter(i => (i._id || i.id) !== targetId && this.normalizeRole(i.role) === role);
    for (const other of others) {
      const otherId = other._id || other.id;
      if (!otherId) continue;
      try {
        await lastValueFrom(this.llmService.setRole(otherId, 'other'));
      } catch (e) {
        console.warn('Failed to demote other role instance', { otherId, role, e });
      }
    }
  }

  async loadLlmInstance(instance: LlmInstance): Promise<void> {
    const id = instance._id || instance.id;
    if (!id) return;

    // Dialog: Rolle w e4hlen
    const dialogRef = this.dialog.open(AdminLlmLoadDialogComponent, {
      width: '520px',
      disableClose: false,
      data: { model: instance.model },
    });

    const dialogRes = await dialogRef.afterClosed().toPromise();
    if (!dialogRes?.role) return;

    const chosenRole: LlmLoadRoleChoice = dialogRes.role;

    try {
      // 1) Rolle setzen
      await lastValueFrom(this.llmService.setRole(id, chosenRole));

      // 2) Exklusivit e4t erzwingen: alle anderen dieser Rolle -> other
      await this.enforceExclusiveRole(id, chosenRole);

      // 3) Laden + Policy: alles au dfer primary/secondary entladen
      const policyRes = await lastValueFrom(this.llmService.loadWithPolicy(id, ['primary', 'secondary']));

      // 4) Status refresh (Backend macht zwar sync nach load/eject, aber UI soll sofort stimmen)
      await lastValueFrom(this.llmService.syncActive());

      // Snackbar
      const ok = !!policyRes?.loaded?.loadResult?.success;
      if (ok) {
        this.snackBar.open(` dc2705 ${instance.model} als ${chosenRole} geladen!`, 'OK', { duration: 3500 });
      } else {
        this.snackBar.open(`${instance.model} Load ausgef fchrt (Role: ${chosenRole})`, 'OK', { duration: 3500 });
      }

      await this.loadLlmInstances();
    } catch (error) {
      console.error('Failed to load LLM instance with role/policy:', error);
      this.snackBar.open('Laden fehlgeschlagen', 'OK', { duration: 3500 });
      // best effort refresh
      try {
        await this.loadLlmInstances();
      } catch {
        // ignore
      }
    }
  }

  async ejectLlmInstance(instance: LlmInstance): Promise<void> {
    const id = instance._id || instance.id;
    if (!id) return;

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
      const result = await lastValueFrom(this.llmService.eject(id));

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

      // Ensure backend syncs active flags and UI sees the latest state
      await lastValueFrom(this.llmService.syncActive());
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
        (this.config as any).repeatPenalty = instance.config.repeatPenalty ?? 1;
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
    if (!this.activeInstance?._id) {
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
    const total = this.stats?.byModel?.length ?? 0;
    this.allModelsSelected = total > 0 && this.selectedModels.size === total;
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
    if (!transcript?._id) {
      this.snackBar.open('Transkript-ID fehlt – Update nicht möglich', 'OK', { duration: 3000 });
      return;
    }

    try {
      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${transcript._id}`, {
          category: newCategory
        }, { withCredentials: true })
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

  // Inline save from expandable row
  async onInlineSave(updated: Transcript): Promise<void> {
    if (!updated._id) return;

    this.isSavingTranscriptId = updated._id;

    const payload: Partial<Transcript> = {
      aiAdjustedText: updated.aiAdjustedText,
      assignedAreaId: updated.assignedAreaId || undefined,
      assignedEntityId: updated.assignedEntityId || undefined,
      assignedTrigger: updated.assignedTrigger || undefined,
      assignedAction: updated.assignedAction,
      manuallyValid: (updated as any).manuallyValid,
    };

    try {
      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${updated._id}`, payload, { withCredentials: true })
      );

      // Update local data
      const index = this.transcripts.findIndex(t => t._id === updated._id);
      if (index !== -1) {
        this.transcripts[index] = { ...this.transcripts[index], ...payload } as Transcript;
      }

      // mark as recently updated (will show green)
      this.recentlyUpdated.add(updated._id);

      this.snackBar.open('Transkript erfolgreich gespeichert', 'OK', { duration: 3000 });
      this.expandedElement = null; // Close the expanded row after save
    } catch (error) {
      console.error('Failed to save transcript:', error);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    } finally {
      this.isSavingTranscriptId = null;
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
      const current = { ...(this.settings.current) } as any;
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

  /** Entfernt doppelte LLM-Instanzen (Backend-Dedupe) */
  async cleanupDuplicates(): Promise<void> {
    if (this.isCleaningDuplicates) return;
    this.isCleaningDuplicates = true;

    try {
      const res = await lastValueFrom(
        this.http.post<any>(`${this.backendUrl}/api/llm-instances/cleanup`, {})
      );

      const deleted = (res && typeof res.deleted === 'number') ? res.deleted : undefined;
      this.snackBar.open(
        deleted != null ? `Duplikate entfernt: ${deleted}` : 'Duplikate entfernt.',
        'OK',
        { duration: 4000 }
      );

      await this.loadLlmInstances();
    } catch (e) {
      console.error('cleanupDuplicates failed', e);
      this.snackBar.open('Fehler beim Entfernen der Duplikate.', 'OK', { duration: 5000 });
    } finally {
      this.isCleaningDuplicates = false;
    }
  }

  // Helper to safely coerce values to numbers for the template
  num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
}

