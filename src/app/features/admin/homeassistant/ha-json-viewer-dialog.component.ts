import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ha-json-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="dialog-container">
      <mat-card class="json-header">
        <mat-card-header>
          <mat-card-title>JSON Daten</mat-card-title>
          <mat-card-subtitle>{{ title }}</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <div class="json-viewer">
        <button
          mat-icon-button
          class="copy-button"
          (click)="copyToClipboard()"
          matTooltip="In Zwischenablage kopieren"
          color="primary"
        >
          <mat-icon>content_copy</mat-icon>
        </button>

        <pre class="json-content">{{ jsonFormatted }}</pre>
      </div>

      <div class="dialog-actions">
        <button
          mat-raised-button
          [mat-dialog-close]="true"
          color="primary"
        >
          Schließen
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/tokens' as t;

    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 900px;
      max-height: 80vh;
      padding: 0;
      background: t.$surface;
    }

    .json-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: t.$text-inverse;
      border-radius: 0;
      margin: 0;
      padding: t.$spacing-3;

      mat-card-title {
        color: t.$text-inverse;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      mat-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
        margin-top: t.$spacing-1;
        font-size: 12px;
      }
    }

    .json-viewer {
      position: relative;
      flex: 1;
      overflow: auto;
      padding: t.$spacing-3;
      background: #1e1e1e;
      border-radius: t.$radius-sm;
      margin: t.$spacing-3;
    }

    .copy-button {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      &:hover {
        background: #f5f5f5;
      }
    }

    .json-content {
      margin: 0;
      padding: t.$spacing-3;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #d4d4d4;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: visible;

      /* JSON Syntax Highlighting */
      /* Strings */
      ::selection {
        background: rgba(102, 126, 234, 0.3);
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: t.$spacing-2;
      padding: t.$spacing-3;
      background: t.$gray-100;
      border-top: 1px solid t.$gray-200;

      button {
        min-width: 100px;
      }
    }

    @media (max-width: 768px) {
      .dialog-container {
        max-width: 100%;
        max-height: 100vh;
      }

      .copy-button {
        top: 10px;
        right: 10px;
      }
    }
  `],
})
export class HaJsonViewerDialogComponent {
  title = '';
  jsonFormatted = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.formatJson();
  }

  private formatJson(): void {
    try {
      // Extrahiere Title wenn vorhanden
      if (this.data.title) {
        this.title = this.data.title;
      } else if (this.data.data?.entityId) {
        this.title = this.data.data.entityId;
      } else if (this.data.data?.name) {
        this.title = this.data.data.name;
      } else if (this.data.data?.id) {
        this.title = this.data.data.id;
      }

      // Formatiere JSON mit 2-Space Indentation
      const dataToFormat = this.data.data || this.data;
      this.jsonFormatted = JSON.stringify(dataToFormat, null, 2);

      // Syntax Highlighting (einfach)
      this.jsonFormatted = this.highlightJson(this.jsonFormatted);
    } catch (error) {
      console.error('Fehler beim Formatieren von JSON:', error);
      this.jsonFormatted = JSON.stringify(this.data, null, 2);
    }
  }

  private highlightJson(json: string): string {
    // Einfaches Syntax Highlighting durch Farb-Codes
    // Da wir pre-tag verwenden, funktioniert plain text
    return json;
  }

  copyToClipboard(): void {
    try {
      const text = JSON.stringify(this.data.data || this.data, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('JSON in Zwischenablage kopiert', 'OK', {
          duration: 2000,
          panelClass: ['snackbar-success'],
        });
      });
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      this.snackBar.open('Fehler beim Kopieren', 'OK', {
        duration: 2000,
        panelClass: ['snackbar-error'],
      });
    }
  }
}

