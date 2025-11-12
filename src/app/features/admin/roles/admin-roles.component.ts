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
  selector: 'app-admin-roles',
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
            <mat-icon>badge</mat-icon>
            Rollen & Rechte (Übersicht)
          </mat-card-title>
          <mat-card-subtitle>Read-only Statistik – Verwaltung einzelner Rechte unter "Rechte"</mat-card-subtitle>
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

          <table mat-table [dataSource]="rows" class="mat-elevation-z1 admin-table">
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef> Rolle </th>
              <td mat-cell *matCellDef="let r"> {{r.role}} </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef> Gesamt </th>
              <td mat-cell *matCellDef="let r"> {{r.total}} </td>
            </ng-container>

            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef> Aktiv </th>
              <td mat-cell *matCellDef="let r"> {{r.active}} </td>
            </ng-container>

            <ng-container matColumnDef="inactive">
              <th mat-header-cell *matHeaderCellDef> Inaktiv </th>
              <td mat-cell *matCellDef="let r"> {{r.inactive}} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Aktionen </th>
              <td mat-cell *matCellDef="let r" style="display:flex; gap:.25rem;">
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
export class AdminRolesComponent implements OnInit {
  rows: any[] = [];
  displayedColumns = ['role', 'total', 'active', 'inactive', 'actions'];
  private nestBase!: string;

  constructor(
    private readonly http: HttpClient,
    private readonly snack: MatSnackBar,
  ) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.nestBase = `http://${host}:${port}`;
  }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    try {
      const res: any = await firstValueFrom(this.http.get(`${this.nestBase}/api/speech/rights/stats`, { withCredentials: true }));
      this.rows = res?.data?.byRole || [];
    } catch (e) {
      this.snack.open('Fehler beim Laden der Rollen-Statistik', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  notSupported() {
    this.snack.open('Aktion nicht verfügbar – Rollen werden über Rechteverwaltung pro Nutzer vergeben', 'Schließen', { duration: 3500 });
  }
}
