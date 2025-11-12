import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {HeaderComponent} from '@shared/components/header/header.component';

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
      const res: any = await this.http.get('/api/homeassistant/entities/areas', { withCredentials: true }).toPromise();
      this.areas = res?.data || res || [];
    } catch (e) {
      this.snack.open('Fehler beim Laden der Bereiche', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  notSupported() {
    this.snack.open('Aktion nicht verfügbar – Bereiche sind read-only (über HA-Import verwaltet)', 'Schließen', { duration: 3500 });
  }
}
