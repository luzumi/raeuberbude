import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { SettingsService } from '../../../core/services/settings.service';
import { LlmService } from '../../../core/services/llm.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

// Nur noch globale Settings im Dialog verwalten
interface GlobalLlmSettings {
  url: string;
  model: string;
  fallbackModel: string;
  targetLatencyMs: number;
  useGpu: boolean;
}

interface ModelOpResult {
  action: 'load' | 'eject';
  instanceId?: string;
  instanceName?: string;
  model: string;
  success: boolean;
  message?: string;
  rawResponse?: any;
}

@Component({
  selector: 'app-admin-global-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule, MatListModule, MatIconModule],
  template: `
    <h2 class="dialog-title">Globale LLM-Einstellungen</h2>

    <div class="dialog-content">
      <div class="dialog-grid">
        <mat-form-field class="full-width">
          <mat-label>LLM URL</mat-label>
          <input matInput [(ngModel)]="localConfig.url" placeholder="http://192.168.56.1:1234/v1/chat/completions">
        </mat-form-field>

        <!-- Primäres Modell: immer Select (falls keine Modelle vorhanden: disabled option) -->
        <mat-form-field class="full-width">
          <mat-label>Primäres Modell</mat-label>
          <mat-select [(ngModel)]="localConfig.model" [disabled]="models.length === 0">
            <mat-option *ngIf="models.length === 0" [value]="localConfig.model">Keine Modelle gefunden</mat-option>
            <mat-option *ngFor="let m of models" [value]="m">{{ m }}</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Fallback Modell: immer Select -->
        <mat-form-field class="full-width">
          <mat-label>Fallback Modell</mat-label>
          <mat-select [(ngModel)]="localConfig.fallbackModel" [disabled]="models.length === 0">
            <mat-option value="">(kein Fallback)</mat-option>
            <mat-option *ngFor="let m of models" [value]="m">{{ m }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Ziel-Latenz (ms)</mat-label>
          <input matInput type="number" [(ngModel)]="localConfig.targetLatencyMs">
        </mat-form-field>

        <div class="toggle-wrap">
          <mat-slide-toggle [(ngModel)]="localConfig.useGpu">GPU verwenden</mat-slide-toggle>
        </div>
      </div>

      <!-- Processing overlay -->
      <div class="processing-overlay" *ngIf="isProcessing">
        <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
        <div class="processing-text">{{ processingText }}</div>
      </div>

      <!-- Operation results panel -->
      <div class="ops-results" *ngIf="operationResults?.length">
        <h3>Ergebnis</h3>
        <mat-list>
          <mat-list-item *ngFor="let r of operationResults">
            <div class="ops-row">
              <div class="ops-left"><strong>{{ r.action | uppercase }}:</strong> <span class="ops-item">{{ r.model }}</span></div>
              <div class="ops-right">
                <span class="ops-status" [class.ok]="r.success" [class.fail]="!r.success">{{ r.success ? 'OK' : 'Fehler' }}</span>
                <button mat-icon-button aria-label="Kopiere Meldung" (click)="copyMessage(r.message)">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            </div>
            <div class="ops-meta">Instanz: {{ r.instanceName || r.instanceId || 'unbekannt' }}</div>
            <pre class="ops-message" *ngIf="r.message">{{ r.message }}</pre>
          </mat-list-item>
        </mat-list>
      </div>
    </div>

    <div class="dialog-actions">
      <button mat-button (click)="onCancel()" [disabled]="isProcessing">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="isProcessing">{{ operationResults?.length ? 'Fertig' : 'Speichern' }}</button>
    </div>
  `,
  styles: [
    `:host { display:block; font-family: inherit; }
     .dialog-title { font-size: 1.25rem; margin: 0 0 12px 0; padding: 12px 18px 0 18px; }
     .dialog-content { max-height: calc(66vh - 56px); overflow:auto; padding: 18px; position:relative; }
     .dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
     .full-width { width: 100%; }
     .toggle-wrap { grid-column: 1 / -1; display:flex; align-items:center; padding-top:6px; }
     .dialog-actions { display:flex; gap:8px; justify-content:flex-end; margin: 8px 18px 0 18px; padding-bottom: 12px; }

     /* Processing overlay */
     .processing-overlay { position:absolute; left:0; right:0; top:0; bottom:0; display:flex; gap:12px; align-items:center; justify-content:center; background: rgba(255,255,255,0.8); z-index: 30; }
     .processing-text { font-weight:600; }

     .ops-results { margin-top:12px; background: #fff; border-radius:6px; padding:8px; border: 1px solid #eee; }
     .ops-item { margin-left:8px; }
     .ops-row { display:flex; justify-content:space-between; align-items:center; width:100%; }
     .ops-left { display:flex; gap:8px; align-items:center; }
     .ops-right { display:flex; gap:8px; align-items:center; }
     .ops-meta { font-size:0.85rem; color:#666; margin-top:6px; }
     .ops-message { background:#fafafa; border-left:3px solid #eee; padding:8px; white-space:pre-wrap; word-break:break-word; margin-top:6px; }
     .ops-status.ok { color: green; font-weight:600; }
     .ops-status.fail { color: #c62828; font-weight:600; }

     @media (max-width: 720px) { .dialog-grid { grid-template-columns: 1fr; } }
    `
  ]
})
export class AdminGlobalConfigDialogComponent {
  localConfig: GlobalLlmSettings = {
    url: '',
    model: '',
    fallbackModel: '',
    targetLatencyMs: 2000,
    useGpu: true
  };

  // Wenn vorhanden: Liste verfügbarer Modelle (z.B. von LM Studio)
  models: string[] = [];
  isProcessing = false;
  processingText = '';
  operationResults: ModelOpResult[] = [];

  constructor(
    private readonly dialogRef: MatDialogRef<AdminGlobalConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly settings: SettingsService,
    private readonly llmService: LlmService,
    private readonly snackBar: MatSnackBar
  ) {
    const base = data?.config || {};
    // Modelle aus dialog-data oder aus runtime settings laden (verschiedene Property-Namen prüfen)
    if (Array.isArray(data?.models)) {
      this.models = data.models;
    } else {
      const cur = (settings as any)?.current || {};
      if (Array.isArray(cur.availableModels)) {
        this.models = cur.availableModels;
      } else if (Array.isArray(cur.models)) {
        this.models = cur.models;
      } else {
        this.models = [];
      }
    }

    this.localConfig = {
      url: base.url || '',
      model: base.model || '',
      fallbackModel: base.fallbackModel || '',
      targetLatencyMs: base.targetLatencyMs ?? 2000,
      useGpu: base.useGpu ?? true
    };
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onSave() {
    // If operationResults already exist, treat Save as Close
    if (this.operationResults?.length) {
      this.dialogRef.close(true);
      return;
    }

    try {
      // Nur globale Felder in die bestehenden Settings zurückschreiben
      const current = { ...(this.settings.current || this.data?.config) };
      current.url = this.localConfig.url;
      current.model = this.localConfig.model;
      current.fallbackModel = this.localConfig.fallbackModel;
      current.targetLatencyMs = this.localConfig.targetLatencyMs;
      current.useGpu = this.localConfig.useGpu;

      await lastValueFrom(this.settings.save(current));

      // Nach dem Speichern: versuche, die ausgewählten Modelle zu laden
      const desired = [this.localConfig.model, this.localConfig.fallbackModel].filter(Boolean).map(String);
      if (desired.length > 0) {
        this.isProcessing = true;
        this.processingText = 'Eject/Load: arbeite...';
        try {
          const results = await this.loadAndSwitchModels(desired);
          this.operationResults = results;
          this.isProcessing = false;

          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;
          this.snackBar.open(`Modelle verarbeitet: ${successCount} erfolgreich, ${failCount} fehlgeschlagen`, 'Details', { duration: 8000 })
            .onAction().subscribe(() => {
              // noop — details are visible inline in dialog
            });
        } catch (e) {
          this.isProcessing = false;
          console.error('Error while switching models:', e);
          this.snackBar.open('Fehler beim Laden/Entladen der Modelle (siehe Konsole)', 'OK', { duration: 6000 });
        }
      }

      this.snackBar.open('Globale Einstellungen gespeichert', 'OK', { duration: 3000 });
      // Note: Keep dialog open to show results; user can click 'Fertig' to close
    } catch (e) {
      console.error('Failed to save global settings from dialog:', e);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }

  private async loadAndSwitchModels(desiredModels: string[]): Promise<ModelOpResult[]> {
    const results: ModelOpResult[] = [];
    try {
      const instances = await lastValueFrom(this.llmService.listInstances());
      const desiredSet = new Set(desiredModels);

      // Instances that provide desired models
      const toLoad = instances.filter(i => i._id && desiredSet.has(i.model) && !i.isActive);
      // Active instances that are NOT in desired models -> eject
      const toEject = instances.filter(i => i._id && i.isActive && !desiredSet.has(i.model));

      // First eject non-desired active instances (best-effort)
      for (const inst of toEject) {
        try {
          this.processingText = `Entlade ${inst.model}...`;
          // eslint-disable-next-line no-await-in-loop
          const res = await lastValueFrom(this.llmService.eject(inst._id as string));
          const ok = !!res?.ejectResult?.success;
          // Build a helpful message from possible response shapes
          const msg = res?.ejectResult?.message || res?.ejectResult?.error  || JSON.stringify(res || {});
          results.push({ action: 'eject', instanceId: inst._id, instanceName: inst.name, model: inst.model, success: ok, message: String(msg), rawResponse: res });
        } catch (e: any) {
          // Http errors thrown by HttpClient may contain status and error body
          const errmsg = e?.message || (e?.error && JSON.stringify(e.error)) || String(e);
          const raw = { status: e?.status, error: e?.error || e };
          results.push({ action: 'eject', instanceId: inst._id, instanceName: inst.name, model: inst.model, success: false, message: String(errmsg), rawResponse: raw });
        }
      }

      // Then load desired models (best-effort)
      for (const inst of toLoad) {
        try {
          this.processingText = `Lade ${inst.model}...`;
          // eslint-disable-next-line no-await-in-loop
          const res = await lastValueFrom(this.llmService.load(inst._id as string));
          const ok = !!res?.loadResult?.success;
          const msg = res?.loadResult?.message || res?.loadResult?.error || JSON.stringify(res || {});
          results.push({ action: 'load', instanceId: inst._id, instanceName: inst.name, model: inst.model, success: ok, message: String(msg), rawResponse: res });
        } catch (e: any) {
          const errmsg = e?.message || (e?.error && JSON.stringify(e.error)) || String(e);
          const raw = { status: e?.status, error: e?.error || e };
          results.push({ action: 'load', instanceId: inst._id, instanceName: inst.name, model: inst.model, success: false, message: String(errmsg), rawResponse: raw });
        }
      }

      // Refresh list after operations
      await lastValueFrom(this.llmService.listInstances());
      return results;
    } catch (e) {
      console.error('Error in loadAndSwitchModels:', e);
      throw e;
    }
  }

  copyMessage(msg?: string) {
    if (!msg) return;
    try {
      navigator.clipboard.writeText(msg);
      this.snackBar.open('Meldung in die Zwischenablage kopiert', 'OK', { duration: 2000 });
    } catch (e) {
      console.warn('Clipboard write failed, falling back to prompt', e);
      // Fallback: show prompt with text to copy
      // eslint-disable-next-line no-alert
      prompt('Copy the message manually:', msg);
    }
  }
}
