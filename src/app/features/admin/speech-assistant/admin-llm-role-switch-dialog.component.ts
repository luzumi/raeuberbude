import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';

export type LlmInstanceRole = 'primary' | 'secondary' | 'other';
export type RoleConflictResolution = 'replace' | 'cancel';

export interface RoleConflictInfo {
  role: Exclude<LlmInstanceRole, 'other'>;
  otherInstanceId: string;
  otherInstanceLabel: string;
}

export interface AdminLlmRoleSwitchDialogData {
  model: string;
  currentRole: LlmInstanceRole;
  conflicts: {
    primary?: RoleConflictInfo;
    secondary?: RoleConflictInfo;
  };
}

export interface AdminLlmRoleSwitchDialogResult {
  newRole: LlmInstanceRole;
  resolution?: RoleConflictResolution;
}

@Component({
  selector: 'app-admin-llm-role-switch-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>LLM Rolle ändern</h2>

    <div mat-dialog-content>
      <p>
        Instanz: <strong>{{ data?.model }}</strong>
      </p>

      <mat-radio-group [(ngModel)]="role" aria-label="Rolle wählen">
        <mat-radio-button class="radio" value="primary">Primary</mat-radio-button>
        <mat-radio-button class="radio" value="secondary">Secondary</mat-radio-button>
        <mat-radio-button class="radio" value="other">Other (inaktiv)</mat-radio-button>
      </mat-radio-group>

      <div *ngIf="selectedConflict" style="margin-top: 12px; padding: 10px; border-radius: 6px; background: rgba(255, 193, 7, 0.18);">
        <p style="margin: 0 0 8px 0;">
          <strong>Konflikt:</strong> Es gibt bereits ein <strong>{{ selectedConflict.role }}</strong>.
        </p>
        <p style="margin: 0 0 10px 0; opacity: 0.9;">
          Betroffene Instanz: <code>{{ selectedConflict.otherInstanceLabel }}</code>
        </p>

        <mat-radio-group [(ngModel)]="resolution" aria-label="Konflikt auflösen">
          <mat-radio-button class="radio" value="replace">
            Ja, ersetzen (andere Instanz wird auf <code>other</code> gesetzt)
          </mat-radio-button>
          <mat-radio-button class="radio" value="cancel">Abbrechen</mat-radio-button>
        </mat-radio-group>
      </div>

      <p style="margin-top: 12px; opacity: 0.75;">
        Hinweis: Primary und Secondary dürfen jeweils nur einmal existieren.
      </p>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="confirm()" [disabled]="!canConfirm">
        Übernehmen
      </button>
    </div>
  `,
  styles: [
    `
      .radio {
        display: block;
        margin: 6px 0;
      }
    `,
  ],
})
export class AdminLlmRoleSwitchDialogComponent {
  role: LlmInstanceRole;
  resolution: RoleConflictResolution = 'replace';

  constructor(
    private readonly dialogRef: MatDialogRef<AdminLlmRoleSwitchDialogComponent, AdminLlmRoleSwitchDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AdminLlmRoleSwitchDialogData,
  ) {
    this.role = data?.currentRole || 'other';
  }

  get selectedConflict(): RoleConflictInfo | null {
    if (this.role === 'primary') return this.data?.conflicts?.primary || null;
    if (this.role === 'secondary') return this.data?.conflicts?.secondary || null;
    return null;
  }

  get canConfirm(): boolean {
    // Wenn sich nichts ändert, nicht bestätigen.
    if (this.role === (this.data?.currentRole || 'other')) return false;

    // Bei Konflikt muss Entscheidung gefallen sein.
    if (this.selectedConflict) return this.resolution === 'replace';

    return true;
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (!this.canConfirm) return;

    const conflict = this.selectedConflict;
    if (conflict) {
      this.dialogRef.close({ newRole: this.role, resolution: this.resolution });
      return;
    }

    this.dialogRef.close({ newRole: this.role });
  }
}

