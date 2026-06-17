import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HeaderComponent } from '@shared/components/header/header.component';
import { TerminalService } from '../../../core/services/terminal.service';
import { firstValueFrom } from 'rxjs';

const DEFAULT_ROOMS = [
  'Flur',
  'Küche',
  'Büro',
  'Wohnzimmer',
  'Schlafzimmer 1 (Catwoman)',
  'Schlafzimmer 2 (Räuberbude)',
  'Mobil',
];

@Component({
  selector: 'app-admin-terminals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    HeaderComponent,
  ],
  styles: [`
    .status-active      { color: #4caf50; font-weight: 600; }
    .status-inactive    { color: #9e9e9e; }
    .status-maintenance { color: #ff9800; }
    .edit-row td        { background: rgba(0,150,136,0.05); }
    .room-chips         { display: flex; flex-wrap: wrap; gap: 4px; }
    .room-chip          { background: rgba(0,150,136,0.15); border-radius: 12px; padding: 2px 8px; font-size: .82em; }
  `],
  template: `
    <app-header></app-header>
    <div class="admin-page">
      <div class="admin-shell">
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>devices</mat-icon>
              Terminals
            </mat-card-title>
            <mat-card-subtitle>Verwaltung und Raumzuordnung</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="admin-actions-row">
              <button mat-raised-button (click)="load()">
                <mat-icon>refresh</mat-icon>
                Aktualisieren
              </button>
            </div>

            <div *ngIf="terminals.length === 0" style="padding:32px;text-align:center">
              <mat-icon style="font-size:48px;width:48px;height:48px;color:#9e9e9e">devices</mat-icon>
              <p style="color:#666;margin-top:8px">Keine Terminals gefunden.</p>
            </div>

            <table *ngIf="terminals.length > 0" mat-table [dataSource]="terminals" class="mat-elevation-z1 admin-table">

              <ng-container matColumnDef="terminalId">
                <th mat-header-cell *matHeaderCellDef>Terminal-ID</th>
                <td mat-cell *matCellDef="let t">
                  <strong>{{ t.terminalId }}</strong>
                  <div style="font-size:.8em;opacity:.7">{{ t.name }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Typ</th>
                <td mat-cell *matCellDef="let t">{{ t.type }}</td>
              </ng-container>

              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef>Räume</th>
                <td mat-cell *matCellDef="let t">
                  <ng-container *ngIf="editingId !== t._id; else editTpl">
                    <div class="room-chips" *ngIf="asArray(t.location).length > 0">
                      <span class="room-chip" *ngFor="let r of asArray(t.location)">{{ r }}</span>
                    </div>
                    <span *ngIf="asArray(t.location).length === 0" style="opacity:.5">— nicht zugewiesen</span>
                  </ng-container>
                  <ng-template #editTpl>
                    <mat-form-field appearance="outline" style="width:240px;margin:4px 0">
                      <mat-label>Räume wählen</mat-label>
                      <mat-select [(ngModel)]="editLocations" multiple>
                        <mat-option *ngFor="let r of allRooms" [value]="r">{{ r }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </ng-template>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let t">
                  <span [class]="'status-' + t.status">{{ t.status }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="lastActiveAt">
                <th mat-header-cell *matHeaderCellDef>Zuletzt aktiv</th>
                <td mat-cell *matCellDef="let t" style="font-size:.85em;opacity:.8">
                  {{ t.lastActiveAt ? (t.lastActiveAt | date:'dd.MM.yy HH:mm') : '—' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Aktionen</th>
                <td mat-cell *matCellDef="let t">
                  <ng-container *ngIf="editingId !== t._id">
                    <button mat-icon-button color="primary" matTooltip="Räume zuweisen" (click)="startEdit(t)">
                      <mat-icon>edit_location</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" matTooltip="Terminal löschen" (click)="deleteTerminal(t)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngIf="editingId === t._id">
                    <button mat-icon-button color="primary" matTooltip="Speichern" (click)="saveEdit(t)" [disabled]="saving">
                      <mat-icon>save</mat-icon>
                    </button>
                    <button mat-icon-button matTooltip="Abbrechen" (click)="cancelEdit()">
                      <mat-icon>close</mat-icon>
                    </button>
                  </ng-container>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [class.edit-row]="editingId === row._id"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
})
export class AdminTerminalsComponent implements OnInit {
  terminals: any[] = [];
  allRooms: string[] = [...DEFAULT_ROOMS];
  displayedColumns = ['terminalId', 'type', 'location', 'status', 'lastActiveAt', 'actions'];

  editingId: string | null = null;
  editLocations: string[] = [];
  saving = false;

  constructor(
    private readonly terminalSvc: TerminalService,
    private readonly http: HttpClient,
    private readonly snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    const [termRes, areaRes] = await Promise.allSettled([
      this.terminalSvc.listTerminals(),
      firstValueFrom(this.http.get('/api/homeassistant/entities/areas', { withCredentials: true })),
    ]);

    if (termRes.status === 'fulfilled') {
      this.terminals = (termRes.value as any)?.data ?? [];
    } else {
      console.error('Terminals laden fehlgeschlagen', termRes.reason);
      this.snack.open('Terminals konnten nicht geladen werden', 'Schließen', { duration: 3000 });
    }

    // HA-Areas mit Standard-Räumen mergen (dedupliziert, alphabetisch)
    const haNames: string[] = areaRes.status === 'fulfilled'
      ? ((areaRes.value as any)?.data ?? areaRes.value ?? []).map((a: any) => a.name).filter(Boolean)
      : [];
    const merged = [...new Set([...DEFAULT_ROOMS, ...haNames])];
    merged.sort((a, b) => {
      // "Mobil" immer ans Ende
      if (a === 'Mobil') return 1;
      if (b === 'Mobil') return -1;
      return a.localeCompare(b, 'de');
    });
    this.allRooms = merged;
  }

  /** Normalisiert location auf string[] (Rückwärtskompatibilität mit alten string-Werten) */
  asArray(location: string | string[] | null | undefined): string[] {
    if (!location) return [];
    return Array.isArray(location) ? location : [location];
  }

  startEdit(terminal: any) {
    this.editingId = terminal._id;
    this.editLocations = this.asArray(terminal.location);
  }

  cancelEdit() {
    this.editingId = null;
    this.editLocations = [];
  }

  async saveEdit(terminal: any) {
    this.saving = true;
    try {
      await this.terminalSvc.updateTerminal(terminal._id, { location: this.editLocations });
      terminal.location = [...this.editLocations];
      this.snack.open('Räume gespeichert', 'OK', { duration: 2000 });
      this.cancelEdit();
    } catch (e: any) {
      this.snack.open('Fehler: ' + (e?.error?.message || e?.message || 'Unbekannt'), 'Schließen', { duration: 3500 });
    } finally {
      this.saving = false;
    }
  }

  async deleteTerminal(terminal: any) {
    if (!confirm(`Terminal "${terminal.terminalId}" wirklich löschen?`)) return;
    try {
      await firstValueFrom(
        this.http.delete(`/api/speech/terminals/${terminal._id}`, { withCredentials: true })
      );
      this.terminals = this.terminals.filter(t => t._id !== terminal._id);
      this.snack.open('Terminal gelöscht', 'OK', { duration: 2000 });
    } catch (e: any) {
      this.snack.open('Fehler beim Löschen: ' + (e?.error?.message || e?.message || 'Unbekannt'), 'Schließen', { duration: 3500 });
    }
  }
}
