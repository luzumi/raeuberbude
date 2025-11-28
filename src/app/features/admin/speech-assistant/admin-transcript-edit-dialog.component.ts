import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { resolveBackendBase } from '../../../core/utils/backend';
import { environment } from '../../../../environments/environment';
import { Transcript } from './transcript.model';
import { TranscriptAssignmentFormComponent } from './transcript-assignment-form.component';

@Component({
  selector: 'app-admin-transcript-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranscriptAssignmentFormComponent,
  ],
  templateUrl: './admin-transcript-edit-dialog.component.html',
  styleUrls: ['./admin-transcript-edit-dialog.component.scss']
})
export class AdminTranscriptEditDialogComponent {
  transcript: Transcript;
  isSaving = false;

  private readonly backendUrl = resolveBackendBase(environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { transcript: Transcript },
    private readonly dialogRef: MatDialogRef<AdminTranscriptEditDialogComponent>,
    private readonly http: HttpClient,
    private readonly snackBar: MatSnackBar
  ) {
    this.transcript = { ...data.transcript };
  }

  async onSave(updated: Transcript): Promise<void> {
    if (this.isSaving) return;

    this.isSaving = true;
    try {
      const payload: Partial<Transcript> = {
        aiAdjustedText: updated.aiAdjustedText,
        assignedAreaId: updated.assignedAreaId || undefined,
        assignedEntityId: updated.assignedEntityId || undefined,
        assignedTrigger: updated.assignedTrigger || undefined,
        assignedAction: updated.assignedAction,
      };

      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${this.transcript._id}`, payload, { withCredentials: true })
      );

      this.snackBar.open('Transkript erfolgreich gespeichert', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to save transcript:', error);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

