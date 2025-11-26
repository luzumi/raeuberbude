import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {HeaderComponent} from '@shared/components/header/header.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-areas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    HeaderComponent,
  ],
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      margin: 24px 0;
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ff9800;
      margin-bottom: 16px;
    }
    .empty-state p {
      margin: 0;
      color: #856404;
      font-size: 16px;
    }
  `],
  template: `
    <app-header></app-header>
    <div class="admin-page">
      <div class="admin-shell">
      <mat-card class="admin-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>map</mat-icon>
            Bereiche (Areas)
          </mat-card-title>
          <mat-card-subtitle>Read-only Übersicht aus HomeAssistant</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="admin-actions-row">
            <button mat-raised-button color="primary" (click)="notSupported()">
              <mat-icon>add</mat-icon>
              Neu
            </button>
            <button mat-raised-button (click)="load()">
              <mat-icon>refresh</mat-icon>
              Aktualisieren
            </button>
            <button mat-raised-button color="accent" (click)="reimport()" [disabled]="isImporting">
              <mat-icon>cloud_download</mat-icon>
              {{ isImporting ? 'Importiere...' : 'HA Daten neu importieren' }}
            </button>
          </div>

          <div *ngIf="areas.length === 0" class="empty-state">
            <mat-icon>warning</mat-icon>
            <p>Keine Areas gefunden. Bitte importieren Sie die Home Assistant Daten.</p>
          </div>

          <table mat-table [dataSource]="areas" class="mat-elevation-z1 admin-table">
            <ng-container matColumnDef="areaId">
              <th mat-header-cell *matHeaderCellDef> Area ID </th>
              <td mat-cell *matCellDef="let a"> {{a.areaId}} </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef> Name </th>
              <td mat-cell *matCellDef="let a"> {{a.name}} </td>
            </ng-container>

            <ng-container matColumnDef="aliases">
              <th mat-header-cell *matHeaderCellDef> Aliases </th>
              <td mat-cell *matCellDef="let a"> {{(a.aliases || []).join(', ')}} </td>
            </ng-container>

            <ng-container matColumnDef="floor">
              <th mat-header-cell *matHeaderCellDef> Etage </th>
              <td mat-cell *matCellDef="let a"> {{a.floor || '-'}} </td>
            </ng-container>

            <ng-container matColumnDef="icon">
              <th mat-header-cell *matHeaderCellDef> Icon </th>
              <td mat-cell *matCellDef="let a"> {{a.icon || '-'}} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Aktionen </th>
              <td mat-cell *matCellDef="let a" style="display:flex; gap:.25rem;">
                <button mat-icon-button color="primary" (click)="notSupported()">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="notSupported()">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
      </div>
    </div>
  `,
})
export class AdminAreasComponent implements OnInit {
  areas: any[] = [];
  displayedColumns = ['areaId', 'name', 'aliases', 'floor', 'icon', 'actions'];
  isImporting = false;

  constructor(
    private readonly http: HttpClient,
    private readonly snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load() {
    try {
      // Bereitgestellt vom Nest HomeAssistant-Modul unter /api/homeassistant/entities/areas
      const res: any = await firstValueFrom(this.http.get('/api/homeassistant/entities/areas', { withCredentials: true }));
      this.areas = res?.data || res || [];
    } catch (e) {
      console.error(e);
      this.snack.open('Fehler beim Laden der Bereiche', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  async reimport() {
    if (this.isImporting) return;

    const confirmed = confirm(
      'Dies importiert die Home Assistant Struktur neu aus der konfigurierten Datei (ha_structure_*.json).\n\n' +
      'Bereiche, Geräte, Entitäten und Services werden aktualisiert.\n\n' +
      'Fortfahren?'
    );

    if (!confirmed) return;

    this.isImporting = true;
    try {
      const response: any = await firstValueFrom(
        this.http.post('/api/homeassistant/import/reimport', {}, { withCredentials: true })
      );

      this.snack.open(
        `✅ Import erfolgreich! ${response.stats?.areas || 0} Areas, ${response.stats?.entities || 0} Entities importiert.`,
        'OK',
        { duration: 5000 }
      );

      // Reload areas
      await this.load();
    } catch (e: any) {
      console.error('Re-import failed:', e);
      this.snack.open(
        `❌ Import fehlgeschlagen: ${e?.error?.message || e?.message || 'Unbekannter Fehler'}`,
        'OK',
        { duration: 5000, panelClass: 'snackbar-error' }
      );
    } finally {
      this.isImporting = false;
    }
  }

  notSupported() {
    this.snack.open('Aktion nicht verfügbar – Bereiche sind read-only (über HA-Import verwaltet)', 'Schließen', { duration: 3500 });
  }
}
