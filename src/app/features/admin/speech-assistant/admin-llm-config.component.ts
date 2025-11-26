import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import {HorizontalSlider} from '@shared/components/horizontal-slider/horizontal-slider';
import { LlmTestService } from '../../../core/services/llm-test.service';
import { SettingsService } from '../../../core/services/settings.service';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-admin-llm-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatSliderModule, MatCheckboxModule, HorizontalSlider],
  template: `
    <mat-accordion [multi]="true">
      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Inference</mat-panel-title>
          <mat-panel-description>Temperature, Response length & Confidence</mat-panel-description>
        </mat-expansion-panel-header>

        <div class="panel-grid">
          <div class="full form-field">
            <label class="field-label">Temperature</label>
            <div class="slider-row">
              <span class="slider-value">{{ local.temperature.toFixed(2) }}</span>
              <app-horizontal-slider [(value)]="local.temperature" (valueChange)="emitChange()" [min]="0" [max]="1" [step]="0.01"></app-horizontal-slider>
            </div>
          </div>

          <mat-form-field class="full">
            <mat-label>Limit Response Length (Max Tokens)</mat-label>
            <input matInput type="number" min="1" [(ngModel)]="local.maxTokens" (ngModelChange)="emitChange()">
          </mat-form-field>

          <div class="full form-field">
            <label class="field-label">Confidence Shortcut</label>
            <div class="slider-row">
              <span class="slider-value">{{ local.confidenceShortcut.toFixed(2) }}</span>
              <app-horizontal-slider [value]="local.confidenceShortcut" (valueChange)="local.confidenceShortcut = $event; emitChange()" [min]="0" [max]="1" [step]="0.05"></app-horizontal-slider>
            </div>
          </div>

          <mat-form-field class="full">
            <mat-label>Ziel-Latenz (ms)</mat-label>
            <input matInput type="number" min="0" [(ngModel)]="local.targetLatencyMs" (ngModelChange)="emitChange()">
          </mat-form-field>
        </div>
      </mat-expansion-panel>

      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Sampling</mat-panel-title>
          <mat-panel-description>Top-K, Top-P und Penalties</mat-panel-description>
        </mat-expansion-panel-header>

        <div class="panel-grid">
          <mat-form-field class="full">
            <mat-label>Top K Sampling</mat-label>
            <input matInput type="number" min="0" [(ngModel)]="local.topK" (ngModelChange)="emitChange()">
          </mat-form-field>

          <div class="full form-field">
            <label class="field-label">Top P Sampling</label>
            <div class="slider-row">
              <span class="slider-value">{{ local.topP.toFixed(2) }}</span>
              <app-horizontal-slider [(value)]="local.topP" (valueChange)="emitChange()" [min]="0" [max]="1" [step]="0.01"></app-horizontal-slider>
            </div>
          </div>

          <div class="full form-field">
            <label class="field-label">Repeat Penalty</label>
            <div class="slider-row">
              <span class="slider-value">{{ local.repeatPenalty.toFixed(2) }}</span>
              <app-horizontal-slider [(value)]="local.repeatPenalty" (valueChange)="emitChange()" [min]="0" [step]="0.01"></app-horizontal-slider>
            </div>
          </div>

          <div class="full form-field">
            <label class="field-label">Min P Sampling</label>
            <div class="slider-row">
              <span class="slider-value">{{ local.minPSampling.toFixed(2) }}</span>
              <app-horizontal-slider [(value)]="local.minPSampling" (valueChange)="emitChange()" [min]="0" [max]="1" [step]="0.01"></app-horizontal-slider>
            </div>
          </div>
        </div>
      </mat-expansion-panel>

      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Load & Performance</mat-panel-title>
          <mat-panel-description>Context length, GPU offload, thread pool, quantization</mat-panel-description>
        </mat-expansion-panel-header>

        <div class="panel-grid">
          <mat-form-field class="full">
            <mat-label>Context Length (tokens)</mat-label>
            <mat-select [(ngModel)]="local.contextLength" (selectionChange)="emitChange()">
              <mat-option [value]="2048">2K (2048 Tokens)</mat-option>
              <mat-option [value]="4096">4K (4096 Tokens)</mat-option>
              <mat-option [value]="8192">8K (8192 Tokens)</mat-option>
              <mat-option [value]="16384">16K (16384 Tokens)</mat-option>
              <mat-option [value]="32768">32K (32768 Tokens)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="full">
            <mat-label>Evaluation Batch Size</mat-label>
            <mat-select [(ngModel)]="local.evalBatchSize" (selectionChange)="emitChange()">
              <mat-option [value]="1">1</mat-option>
              <mat-option [value]="2">2</mat-option>
              <mat-option [value]="4">4</mat-option>
              <mat-option [value]="8">8</mat-option>
              <mat-option [value]="16">16</mat-option>
              <mat-option [value]="32">32</mat-option>
              <mat-option [value]="64">64</mat-option>
              <mat-option [value]="128">128</mat-option>
              <mat-option [value]="256">256</mat-option>
              <mat-option [value]="512">512</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="full form-field">
            <label class="field-label">CPU Thread Pool Size</label>
            <div *ngIf="maxCpuThreads > 0" class="slider-row">
              <span class="slider-value">{{ local.cpuThreads }}</span>
              <app-horizontal-slider [(value)]="local.cpuThreads" (valueChange)="emitChange()" [min]="1" [max]="maxCpuThreads" [step]="1"></app-horizontal-slider>
            </div>
            <div *ngIf="maxCpuThreads === 0">Ermittle CPU-Kerne...</div>
          </div>

          <div class="toggle-row full">
            <mat-slide-toggle [(ngModel)]="local.gpuOffload" (change)="emitChange()">GPU Offload</mat-slide-toggle>
          </div>

          <div class="toggle-row full">
            <mat-slide-toggle [(ngModel)]="local.keepModelInMemory" (change)="emitChange()">Keep Model in Memory</mat-slide-toggle>
          </div>

          <div class="toggle-row full">
            <mat-checkbox [(ngModel)]="local.flashAttention" (change)="emitChange()">Flash Attention</mat-checkbox>
          </div>

          <div class="toggle-row full">
            <mat-checkbox [(ngModel)]="local.kCacheQuant" (change)="emitChange()">K Cache Quantization</mat-checkbox>
          </div>

          <div class="toggle-row full">
            <mat-checkbox [(ngModel)]="local.vCacheQuant" (change)="emitChange()">V Cache Quantization</mat-checkbox>
          </div>
        </div>
      </mat-expansion-panel>
    </mat-accordion>

    <div class="config-actions">
      <button mat-raised-button color="accent" (click)="startTest()" [disabled]="isTesting">
        <mat-icon>mic</mat-icon>
        Testen (Sprachanfrage)
      </button>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" (click)="saveInstance.emit()" [disabled]="!hasInstance">Instanz speichern</button>
      <button mat-flat-button color="accent" (click)="applyGlobal.emit()" [disabled]="!hasInstance">Als globale Defaults übernehmen</button>
    </div>
  `,
  styles: [
    `:host { display:block; }
     .panel-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; }
     .full { width:100%; }
     .toggle-row { padding-top:8px; }
     .config-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:12px; }
     .slider-row { display:flex; align-items:center; gap:12px; }
     .slider-value { width:60px; text-align:right; font-weight:600; }
     /* Ensure mat-slider stays interactive even if overlays are present */
     mat-slider { position: relative; z-index: 10050 !important; pointer-events: auto !important; }
     @media (max-width:720px) { .panel-grid { grid-template-columns: 1fr; } }
    `
  ]
})
export class AdminLlmConfigComponent implements OnChanges, OnInit {
  @Input() config: any = {};
  @Input() hasInstance = false;
  @Output() configChange = new EventEmitter<any>();
  @Output() saveInstance = new EventEmitter<void>();
  @Output() applyGlobal = new EventEmitter<void>();

  local: any = {
    temperature: 0.3,
    maxTokens: 500,
    confidenceShortcut: 0.85,
    targetLatencyMs: 2000,
    topK: 40,
    topP: 0.95,
    repeatPenalty: 1,
    minPSampling: 0.05,
    systemPrompt: '',
    contextLength: 4096,
    evalBatchSize: 512,
    cpuThreads: 6,
    gpuOffload: false,
    keepModelInMemory: true,
    flashAttention: false,
    kCacheQuant: false,
    vCacheQuant: false
  };

  /** Flag für Test-Button (Sprach-Test) */
  isTesting = false;
  maxCpuThreads = 0;

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly llmTestService: LlmTestService,
    private readonly settings: SettingsService
  ) {}

  ngOnInit() {
    this.detectCpuCores();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config) {
      // Merge incoming config with local defaults, preserving all fields
      this.local = {
        temperature: this.config.temperature ?? this.local.temperature,
        maxTokens: this.config.maxTokens ?? this.local.maxTokens,
        confidenceShortcut: this.config.confidenceShortcut ?? this.local.confidenceShortcut,
        targetLatencyMs: this.config.targetLatencyMs ?? this.local.targetLatencyMs,
        topK: this.config.topK ?? this.local.topK,
        topP: this.config.topP ?? this.local.topP,
        repeatPenalty: this.config.repeatPenalty ?? this.local.repeatPenalty,
        minPSampling: this.config.minPSampling ?? this.local.minPSampling,
        contextLength: this.config.contextLength ?? this.local.contextLength,
        evalBatchSize: this.config.evalBatchSize ?? this.local.evalBatchSize,
        cpuThreads: this.config.cpuThreads ?? this.local.cpuThreads,
        gpuOffload: this.config.gpuOffload ?? this.local.gpuOffload,
        keepModelInMemory: this.config.keepModelInMemory ?? this.local.keepModelInMemory,
        flashAttention: this.config.flashAttention ?? this.local.flashAttention,
        kCacheQuant: this.config.kCacheQuant ?? this.local.kCacheQuant,
        vCacheQuant: this.config.vCacheQuant ?? this.local.vCacheQuant,
        systemPrompt: this.config.systemPrompt ?? this.local.systemPrompt
      };
      console.log('AdminLlmConfigComponent: loaded config into local:', this.local);
      console.log('AdminLlmConfigComponent: config.url =', this.config.url, ', config.model =', this.config.model);

      // Ensure cpuThreads does not exceed detected max (if known)
      if (this.maxCpuThreads > 0 && this.local.cpuThreads > this.maxCpuThreads) {
        this.local.cpuThreads = this.maxCpuThreads;
      }
    }
  }

  private detectCpuCores() {
    try {
      if ((navigator as any).hardwareConcurrency) {
        this.maxCpuThreads = Math.max(1, (navigator as any).hardwareConcurrency - 1);
      } else {
        this.maxCpuThreads = 4;
      }
      // clamp local value
      if (this.local && this.local.cpuThreads > this.maxCpuThreads) {
        this.local.cpuThreads = this.maxCpuThreads;
      }
    } catch (e) {
      console.warn('Could not detect hardwareConcurrency:', e);
      this.maxCpuThreads = 4;
    }
  }

  emitChange() {
    this.configChange.emit({ ...this.local });
  }

  async startTest(): Promise<void> {
    if (this.isTesting) {
      console.warn('[AdminLlmConfig] Test already running, ignoring click');
      return;
    }

    console.log('[AdminLlmConfig] ========== STARTING SPEECH TEST ==========');
    this.isTesting = true;

    try {
      // Schritt 1: Mikrofon-Berechtigung prüfen
      this.snackBar.open('🔍 Prüfe Mikrofon-Zugriff...', undefined, { duration: 1000 });
      console.log('[AdminLlmConfig] Checking microphone permissions...');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for ( const track of stream.getTracks() ) { track.stop(); }
        console.log('[AdminLlmConfig] ✅ Microphone access granted');
      } catch (micError: any) {
        console.error('[AdminLlmConfig] ❌ Microphone access denied:', micError);
        throw new Error(`Mikrofon-Zugriff verweigert: ${micError.message}`);
      }

      // Get runtime config as fallback
      const runtimeCfg = this.settings?.current || null;

      // Schritt 2: Test-Config erstellen
      // WICHTIG: Wenn Instanz ausgewählt (hasInstance=true), NUR deren Werte verwenden!
      // Runtime-Config darf NICHT überschreiben wenn Instanz explizit ausgewählt ist
      let selectedUrl: string;
      let selectedModel: string;
      let selectedSystemPrompt: string;

      if (this.hasInstance) {
        // ✅ Instanz ist ausgewählt -> NUR deren Werte verwenden
        if (!this.config.url || !this.config.model) {
          const errorMsg = '⚠️ Instanz ist ausgewählt, aber URL/Model fehlt! Bitte Instanz erneut anklicken.';
          console.error('[AdminLlmConfig]', errorMsg, { config: this.config, hasInstance: this.hasInstance });
          this.snackBar.open(errorMsg, 'OK', { duration: 5000 });
          return;
        }
        selectedUrl = this.config.url;
        selectedModel = this.config.model;
        selectedSystemPrompt = this.config.systemPrompt || this.local.systemPrompt || 'Du bist ein hilfreicher Assistent für ein Smart Home System.';
        console.log('[AdminLlmConfig] 🎯 Using SELECTED instance:', { url: selectedUrl, model: selectedModel });
      } else {
        // ✅ Keine Instanz ausgewählt -> Runtime-Config verwenden
        selectedUrl = runtimeCfg?.url || 'http://192.168.56.1:1234';
        selectedModel = runtimeCfg?.model || 'qwen2.5-0.5b-instruct';
        selectedSystemPrompt = runtimeCfg?.systemPrompt || this.local.systemPrompt || 'Du bist ein hilfreicher Assistent für ein Smart Home System.';
        console.log('[AdminLlmConfig] 🎯 Using RUNTIME config (no instance selected):', { url: selectedUrl, model: selectedModel });
      }

      const testConfig = {
        url: selectedUrl,
        model: selectedModel,
        temperature: this.local.temperature,
        maxTokens: this.local.maxTokens,
        topK: this.local.topK,
        topP: this.local.topP,
        repeatPenalty: this.local.repeatPenalty,
        minPSampling: this.local.minPSampling,
        systemPrompt: selectedSystemPrompt
      };

      console.log('[AdminLlmConfig] 🎯 Test Config Priority Check:');
      console.log('[AdminLlmConfig]   - hasInstance (is instance selected?):', this.hasInstance);
      console.log('[AdminLlmConfig]   - this.config.url (selected instance):', this.config.url);
      console.log('[AdminLlmConfig]   - this.config.model (selected instance):', this.config.model);
      console.log('[AdminLlmConfig]   - runtimeCfg.model (loaded in LM Studio):', runtimeCfg?.model);
      console.log('[AdminLlmConfig] ✅ Final testConfig passed to service:', testConfig);

      // Extra trace logs to diagnose model selection when the test runs
      console.log('[AdminLlmConfig] TRACE: Final payload that will be sent to LlmTestService.runTest');
      console.log('[AdminLlmConfig] TRACE: selected instance config:', this.config);
      console.log('[AdminLlmConfig] TRACE: runtimeCfg (loaded instance):', runtimeCfg);
      console.log('[AdminLlmConfig] TRACE: final testConfig:', testConfig);


      this.snackBar.open('🎤 Starte Aufnahme - bitte sprechen...', undefined, { duration: 30000 });

      // Schritt 3: Test ausführen
      console.log('[AdminLlmConfig] Starting LLM test...');
      const result = await this.llmTestService.runTest(testConfig, 5000);

      console.log('[AdminLlmConfig] ✅ Test completed successfully:', result);

      // Schritt 4: Ergebnis anzeigen
      const llmAnswer = typeof result.llmResult === 'string'
        ? result.llmResult
        : (result.llmResult?.result || JSON.stringify(result.llmResult));

      const message = [
        '✅ Test erfolgreich!',
        `📝 Transkript: "${result.transcript}"`,
        `🤖 Antwort: "${llmAnswer}"`,
        `⏱️ Dauer: ${result.totalDurationMs}ms (STT: ${result.sttDurationMs}ms, LLM: ${result.llmDurationMs}ms)`
      ].join('\n');

      this.snackBar.open(message, 'OK', { duration: 10000 });

    } catch (error: any) {
      console.error('[AdminLlmConfig] ❌ Test failed with error:', error);
      console.error('[AdminLlmConfig] Error stack:', error?.stack);

      let errorMessage = '❌ Test fehlgeschlagen';

      if (error.message?.includes('Mikrofon')) {
        errorMessage += '\n🎤 Mikrofon-Problem: ' + error.message;
        errorMessage += '\n💡 Bitte erlaube den Mikrofon-Zugriff in deinem Browser.';
      } else if (error.message?.includes('Transkription')) {
        errorMessage += '\n🗣️ Transkriptions-Fehler: ' + error.message;
        errorMessage += '\n💡 Stelle sicher, dass der Backend-Server läuft.';
      } else if (error.message?.includes('LLM')) {
        errorMessage += '\n🤖 LLM-Fehler: ' + error.message;
        errorMessage += '\n💡 Prüfe die LLM-Konfiguration und ob LM Studio läuft.';
      } else {
        errorMessage += '\n📋 ' + (error.message || String(error));
      }

      this.snackBar.open(errorMessage, 'OK', { duration: 8000 });

    } finally {
      console.log('[AdminLlmConfig] ========== TEST FINISHED ==========');
      this.isTesting = false;
    }
  }
}
