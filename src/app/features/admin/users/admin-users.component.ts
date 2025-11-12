import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import {HeaderComponent} from '@shared/components/header/header.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    RouterLink,
    HeaderComponent,
  ],
  template: `
    <app-header></app-header>
    <div class="admin-page">
      <div class="admin-shell">
      <mat-card class="admin-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>group</mat-icon>
            Benutzerverwaltung
          </mat-card-title>
          <mat-card-subtitle>CRUD für Benutzer</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="admin-actions-row">
            <button mat-raised-button color="primary" (click)="startCreate()">
              <mat-icon>add</mat-icon>
              Neu
            </button>
            <a routerLink="/admin/rechte" mat-button>
              <mat-icon>security</mat-icon>
              Rechte verwalten
            </a>
          </div>

          <table mat-table [dataSource]="users" class="mat-elevation-z1 admin-table">
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef> Benutzername </th>
              <td mat-cell *matCellDef="let u"> {{u.username}} </td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef> E-Mail </th>
              <td mat-cell *matCellDef="let u"> {{u.email || '-'}} </td>
            </ng-container>

            <ng-container matColumnDef="pwd">
              <th mat-header-cell *matHeaderCellDef> Passwort </th>
              <td mat-cell *matCellDef="let u"> {{u.password || '-'}} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Aktionen </th>
              <td mat-cell *matCellDef="let u" style="display:flex; gap:.25rem;">
                <button mat-icon-button color="primary" (click)="edit(u)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="remove(u)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
      <div class="admin-stack">
      <mat-card class="admin-card">
        <mat-card-header>
          <mat-card-title>{{ selectedUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="user-form admin-form-grid-2">
            <mat-form-field appearance="fill">
              <mat-label>Benutzername</mat-label>
              <input matInput formControlName="username" required>
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>E-Mail</mat-label>
              <input matInput type="email" formControlName="email">
            </mat-form-field>
          </form>
          <div class="admin-form-actions">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.valid">
              <mat-icon>save</mat-icon>
              Speichern
            </button>
            <button mat-button (click)="cancel()">
              <mat-icon>clear</mat-icon>
              Abbrechen
            </button>
          </div>
        </mat-card-content>
      </mat-card>
      </div>
      </div>
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  displayedColumns = ['username', 'email', 'actions'];
  form: FormGroup;
  selectedUser: any = null;
  private readonly nestBase: string;

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
    private readonly snack: MatSnackBar,
  ) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.nestBase = `http://${host}:${port}`;
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  private async load() {
    try {
      this.users = await firstValueFrom(this.http.get<any[]>(`${this.nestBase}/users`, { withCredentials: true }));
    } catch (e) {
      console.error(e);
      this.snack.open('Fehler beim Laden der Benutzer', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  startCreate() {
    this.selectedUser = null;
    this.form.reset({ username: '', email: '' });
  }

  edit(u: any) {
    this.selectedUser = u;
    this.form.patchValue({ username: u.username, email: u.email || '' });
  }

  async save() {
    const val = this.form.value;
    try {
      if (this.selectedUser?._id) {
        await firstValueFrom(this.http.patch(`${this.nestBase}/users/${this.selectedUser._id}`, val, { withCredentials: true }));
        this.snack.open('Benutzer aktualisiert', 'Schließen', { duration: 2500 });
      } else {
        await firstValueFrom(this.http.post(`${this.nestBase}/users`, val, { withCredentials: true }));
        this.snack.open('Benutzer erstellt', 'Schließen', { duration: 2500 });
      }
      this.startCreate();
      await this.load();
    } catch (e) {
      console.error(e);
      this.snack.open('Speichern fehlgeschlagen', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  async remove(u: any) {
    if (!confirm(`Benutzer "${u.username}" löschen?`)) return;
    try {
      await firstValueFrom(this.http.delete(`${this.nestBase}/users/${u._id}`, { withCredentials: true }));
      this.snack.open('Benutzer gelöscht', 'Schließen', { duration: 2500 });
      await this.load();
    } catch (e) {
      console.error(e);
      this.snack.open('Löschen fehlgeschlagen', 'Schließen', { duration: 3000, panelClass: 'snackbar-error' });
    }
  }

  cancel() {
    this.startCreate();
  }
}
