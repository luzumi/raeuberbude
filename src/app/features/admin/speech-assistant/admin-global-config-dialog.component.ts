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

// Nur noch globale Settings im Dialog verwalten
interface GlobalLlmSettings {
  url: string;
  model: string;
  fallbackModel: string;
  targetLatencyMs: number;
  useGpu: boolean;
}

@Component({
  selector: 'app-admin-global-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 class="dialog-title">Globale LLM-Einstellungen</h2>

    <div class="dialog-content">
      <div class="dialog-grid">
        <mat-form-field class="full-width">
          <mat-label>LLM URL</mat-label>
          <input matInput [(ngModel)]="localConfig.url" placeholder="http://192.168.56.1:1234/v1/chat/completions">
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Primäres Modell</mat-label>
          <input matInput [(ngModel)]="localConfig.model" placeholder="mistralai/mistral-7b-instruct-v0.3">
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Fallback Modell</mat-label>
          <input matInput [(ngModel)]="localConfig.fallbackModel" placeholder="">
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Ziel-Latenz (ms)</mat-label>
          <input matInput type="number" [(ngModel)]="localConfig.targetLatencyMs">
        </mat-form-field>

        <div class="toggle-wrap">
          <mat-slide-toggle [(ngModel)]="localConfig.useGpu">GPU verwenden</mat-slide-toggle>
        </div>
      </div>
    </div>

    <div class="dialog-actions">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="onSave()">Speichern</button>
    </div>
  `,
  styles: [
    `:host { display:block; font-family: inherit; }
     .dialog-title { font-size: 1.25rem; margin: 0 0 12px 0; padding: 12px 18px 0 18px; }
     .dialog-content { max-height: calc(66vh - 56px); overflow:auto; padding: 18px; }
     .dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
     .full-width { width: 100%; }
     .toggle-wrap { grid-column: 1 / -1; display:flex; align-items:center; padding-top:6px; }
     .dialog-actions { display:flex; gap:8px; justify-content:flex-end; margin: 8px 18px 0 18px; padding-bottom: 12px; }
     @media (max-width: 720px) {
       .dialog-grid { grid-template-columns: 1fr; }
       .toggle-wrap { justify-content:flex-start; }
     }
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

  constructor(
    private readonly dialogRef: MatDialogRef<AdminGlobalConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly settings: SettingsService,
    private readonly snackBar: MatSnackBar
  ) {
    const base = data?.config || {};
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
    try {
      // Nur globale Felder in die bestehenden Settings zurückschreiben
      const current = { ...(this.settings.current || this.data?.config || {}) } as any;
      current.url = this.localConfig.url;
      current.model = this.localConfig.model;
      current.fallbackModel = this.localConfig.fallbackModel;
      current.targetLatencyMs = this.localConfig.targetLatencyMs;
      current.useGpu = this.localConfig.useGpu;

      await lastValueFrom(this.settings.save(current));
      this.snackBar.open('Globale Einstellungen gespeichert', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e) {
      console.error('Failed to save global settings from dialog:', e);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }
}
