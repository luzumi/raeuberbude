import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TerminalService } from '../../core/services/terminal.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type TerminalOption = { terminalId: string; name: string } & Record<string, unknown>;

@Component({
  selector: 'app-terminal-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="login-wrapper">
      <div class="login-form" style="min-width: 320px; max-width: 520px; width: 90%;">
        <h2>Terminal zuweisen</h2>

        <ng-container *ngIf="state === 'loading'">
          <p>Lade Terminal-Status …</p>
        </ng-container>

        <ng-container *ngIf="state !== 'loading'">
          <div *ngIf="current" class="current-box">
            <div><b>Aktuelles Gerät</b></div>
            <div><b>Name:</b> {{ current?.name }} ({{ current?.type }})</div>
            <div><b>Terminal-ID:</b> {{ current?.terminalId }}</div>
            <div><b>Standort:</b> {{ current?.location || '—' }} | <b>Status:</b> {{ current?.status }}</div>
          </div>

          <div class="row" *ngIf="state === 'current'">
            <button mat-raised-button color="primary" (click)="goHome()">Weiter zum Dashboard</button>
          </div>

          <h3 *ngIf="!creatingMode">Terminal-ID auswählen</h3>
          <mat-form-field *ngIf="!creatingMode" appearance="fill" style="width: 100%">
            <input type="text"
                   placeholder="Terminal-ID auswählen"
                   matInput
                   [formControl]="terminalCtrl"
                   [matAutocomplete]="auto">
            <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn"
                              (optionSelected)="onSelect($event.option.value)">
              <mat-option *ngFor="let t of filteredTerminals" [value]="t">
                <div class="opt-line">
                  <span class="opt-id">{{ t.terminalId }}</span>
                  <span class="opt-name" *ngIf="t.name">— {{ t.name }}</span>
                </div>
              </mat-option>
              <mat-option (onSelectionChange)="onAddNew()" [value]="null">
                + Neues Terminal hinzufügen
              </mat-option>
            </mat-autocomplete>
          </mat-form-field>

          <div class="row" *ngIf="!creatingMode">
            <button mat-raised-button color="primary" (click)="onClaimSelected()" [disabled]="!selectedTerminal || claiming">Zuweisen</button>
            <span *ngIf="claiming">…</span>
          </div>

          <ng-container *ngIf="creatingMode">
            <h3>Neues Terminal anlegen</h3>
            <mat-form-field appearance="fill" style="width: 100%">
              <input matInput placeholder="Terminal-ID (z.B. Badezimmer)" [(ngModel)]="form.terminalId"/>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%">
              <input matInput placeholder="Standort (optional)" [(ngModel)]="form.location"/>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%">
              <input matInput placeholder="Typ (z.B. browser/mobile/tablet)" [(ngModel)]="form.type"/>
            </mat-form-field>
            <div class="row">
              <button mat-raised-button color="secondary" (click)="onCreate()" [disabled]="creating">Anlegen</button>
              <span *ngIf="creating">…</span>
            </div>
          </ng-container>
          <p class="error" *ngIf="message">{{ message }}</p>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper { display: flex; justify-content: center; align-items: center; height: 100vh; background: radial-gradient(circle at center, rgba(0,150,136,0.2), rgba(0,0,0,0.9)); }
    .login-form { display: flex; flex-direction: column; gap: 1rem; padding: 2rem; background: rgba(255,255,255,0.1); border: 1px solid #004d40; border-radius: 8px; box-shadow: 0 0 10px rgba(255,255,255,0.2); color: #004d40; }
    .row { display: flex; gap: .5rem; align-items: center; }
    .current-box { padding: .75rem; border: 1px dashed rgba(255,255,255,.3); border-radius: 6px; margin-bottom: .5rem; }
    .opt-line { display: flex; gap: .5rem; align-items: baseline; }
    .opt-id { font-weight: 600; }
    .opt-name { opacity: .8; font-size: .9em; }
  `]
})
export class TerminalSetupComponent implements OnInit {
  state: 'loading' | 'current' | 'idle' = 'loading';
  current: any = null;
  claiming = false;
  creating = false;
  creatingMode = false;
  message = '';
  form = { terminalId: '', type: 'browser', location: '' };

  terminalCtrl = new FormControl<string | TerminalOption | null>('');
  filteredTerminals: TerminalOption[] = [];
  selectedTerminal: TerminalOption | null = null;

  constructor(private readonly svc: TerminalService, private readonly router: Router, private readonly snackBar: MatSnackBar) {}

  ngOnInit(): void {
    (async () => {
      await this.refresh();
      if (this.state === 'current') {
        // Bereits registriert -> direkt ins Dashboard
        this.router.navigate(['/']);
        return;
      }
      await this.loadTerminals();
    })();
  }

  private async refresh() {
    this.state = 'loading';
    const res = await this.svc.getMyTerminal();
{{ ... }}
      this.current = res.data;
      this.state = 'current';
    } else {
      this.current = null;
      this.state = 'idle';
    }
  }

  private async loadTerminals() {
    try {
      const res = await this.svc.listTerminals();
      this.terminals = (res?.data ?? []).map((t: any) => ({ terminalId: t.terminalId, name: t.name, ...t }));
      this.filteredTerminals = this.terminals.slice(0, 50);
      this.terminalCtrl.valueChanges.subscribe((val) => {
        const raw = typeof val === 'string' ? val : (val?.terminalId || val?.name || '');
        const q = raw.toLowerCase();
        this.filteredTerminals = this.terminals
          .filter(t => (t.terminalId?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q)))
          .slice(0, 50);
      });
    } catch (e) {
      console.error('Terminal-Liste konnte nicht geladen werden:', e);
      this.terminals = [];
      this.filteredTerminals = [];
    }
  }

  displayFn = (t: TerminalOption | string | null) => typeof t === 'string' ? t : (t?.terminalId ?? '');

  onSelect(t: any) {
    this.selectedTerminal = t;
  }

  onAddNew() {
    this.creatingMode = true;
    this.selectedTerminal = null;
  }

  async onClaimSelected() {
    if (!this.selectedTerminal) return;
    this.message = '';
    this.claiming = true;
    try {
      await this.svc.claimTerminal(this.selectedTerminal.terminalId);
      await this.svc.ensureTerminal();
      await this.refresh();
      const ref = this.snackBar.open('Terminal erfolgreich zugeordnet.', 'OK', { duration: 2000, horizontalPosition: 'center', verticalPosition: 'bottom' });
      ref.afterDismissed().subscribe(() => this.router.navigate(['/']));
    } catch (e: any) {
      this.message = 'Zuordnung fehlgeschlagen: ' + (e?.error?.message || e?.message || 'Unbekannter Fehler');
    } finally {
      this.claiming = false;
    }
  }

  async onCreate() {
    this.message = '';
    this.creating = true;
    try {
      const id = this.form.terminalId?.trim() || 'Neues Terminal';
      // Falls ID bereits existiert: direkt claimen statt neu anlegen
      const exists = this.terminals.some(t => (t.terminalId || '').toLowerCase() === id.toLowerCase());
      if (!exists) {
        await this.svc.createTerminal(id, this.form.type, this.form.location || undefined);
      }
      // Cookie setzen für dieses Gerät über Claim (Backend akzeptiert ID/Name als Identifier)
      await this.svc.claimTerminal(id);
      // Optional: capabilities/metadata aktualisieren
      await this.svc.ensureTerminal();
      await this.refresh();
      // Snackbar und Redirect zur Startseite (nach Dismiss)
      const ref = this.snackBar.open(exists ? 'Terminal wurde diesem Gerät zugewiesen.' : 'Terminal wurde angelegt und diesem Gerät zugewiesen.', 'OK', {
        duration: 2500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      ref.afterDismissed().subscribe(() => this.router.navigate(['/']));
      this.creatingMode = false;
      await this.loadTerminals();
    } catch (e: any) {
      const status = e?.status || e?.error?.status;
      if (status === 409) {
        // Fallback: bei Konflikt direkt claimen
        try {
          await this.svc.claimTerminal(this.form.terminalId?.trim() || '');
          await this.refresh();
          const ref2 = this.snackBar.open('Terminal wurde diesem Gerät zugewiesen.', 'OK', { duration: 2500, horizontalPosition: 'center', verticalPosition: 'bottom' });
          ref2.afterDismissed().subscribe(() => this.router.navigate(['/']));
          this.creatingMode = false;
          await this.loadTerminals();
          return;
        } catch {
          this.message = 'Terminal-ID existiert bereits. Bitte eine andere ID wählen.';
          this.snackBar.open(this.message, 'Schließen', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom' });
        }
      } else {
        this.message = 'Anlegen fehlgeschlagen: ' + (e?.error?.message || e?.message || 'Unbekannter Fehler');
        this.snackBar.open(this.message, 'Schließen', { duration: 3500, horizontalPosition: 'center', verticalPosition: 'bottom' });
      }
    } finally {
      this.creating = false;
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
