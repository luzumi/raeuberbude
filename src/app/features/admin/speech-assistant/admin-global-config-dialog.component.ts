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

@Component({
  selector: 'app-admin-global-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 style="margin:0 0 12px 0">Globale LLM-Einstellungen</h2>

    <div class="dialog-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
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

      <mat-form-field class="full-width">
        <mat-label>Timeout (ms)</mat-label>
        <input matInput type="number" [(ngModel)]="localConfig.timeoutMs">
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Max Tokens</mat-label>
        <input matInput type="number" [(ngModel)]="localConfig.maxTokens">
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Temperature</mat-label>
        <input matInput type="number" step="0.1" [(ngModel)]="localConfig.temperature">
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Confidence Shortcut</mat-label>
        <input matInput type="number" step="0.01" [(ngModel)]="localConfig.confidenceShortcut">
      </mat-form-field>

      <mat-slide-toggle [(ngModel)]="localConfig.useGpu">GPU verwenden</mat-slide-toggle>
      <mat-slide-toggle [(ngModel)]="localConfig.heuristicBypass">Heuristik-Bypass</mat-slide-toggle>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="onSave()">Speichern</button>
    </div>
  `
})
export class AdminGlobalConfigDialogComponent {
  localConfig: any = {};

  constructor(
    private readonly dialogRef: MatDialogRef<AdminGlobalConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly settings: SettingsService,
    private readonly snackBar: MatSnackBar
  ) {
    // create a shallow copy
    this.localConfig = { ...(data?.config || {}) };
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onSave() {
    try {
      await lastValueFrom(this.settings.save(this.localConfig));
      this.snackBar.open('Globale Einstellungen gespeichert', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e) {
      console.error('Failed to save global settings from dialog:', e);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }
}

