// Verschoben aus den Control-Features in den Shared-Bereich
import {Component, Input} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import {Location} from '@angular/common';
import {HeaderComponent} from '@shared/components/header/header.component';
import { TerminalService } from '../../../core/services/terminal.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterLink, HeaderComponent, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <app-header></app-header>
    <div class="admin-page">
      <div class="admin-shell">
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-card-title>Menü</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="admin-grid">
              <mat-card class="admin-card admin-section-card">
                <h3>Allgemein</h3>
                <div class="group">
                  <button mat-raised-button color="primary" (click)="switchTerminal()" class="rb-hover-shader">Terminal wechseln</button>
                  <a routerLink="/admin/terminals" mat-stroked-button >Terminals</a>
                  <a routerLink="/admin/users" mat-stroked-button >Benutzer</a>
                  <a routerLink="/admin/rechte" mat-stroked-button >Rechte</a>
                  <a routerLink="/admin/rollen" mat-stroked-button >Rollen</a>
                </div>
              </mat-card>

              <mat-card class="admin-card admin-section-card">
                <h3>Administration</h3>
                <nav class="admin-nav">
                  <a routerLink="/admin/homeassistant" mat-stroked-button>
                    <mat-icon>home</mat-icon>
                    Homeassistent
                  </a>
                  <a routerLink="/admin/speech-assistant" mat-stroked-button>
                    <mat-icon>mic</mat-icon>
                    Sprachassistent
                  </a>
                </nav>
              </mat-card>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="close()">Schließen</button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .group { display: flex; gap: 8px; flex-wrap: wrap; }
  `]
})
export class MenuComponent {
  /**
   * Optionales Callback, das vom Parent gesetzt werden kann,
   * um das Menü zu schließen. Ist keins definiert, geht es eine Seite zurück.
   */
  @Input() closeCallback?: OmitThisParameter<() => void>;

  constructor(
    private readonly location: Location,
    private readonly terminal: TerminalService,
    private readonly router: Router,
  ) {}

  /**
   * Führt das optionale Schließen-Callback aus oder navigiert zurück.
   */
  close() {
    if (this.closeCallback) {
      this.closeCallback();
    } else {
      this.location.back();
    }
  }

  async switchTerminal() {
    try {
      await this.terminal.unclaimTerminal();
    } catch {
      // Ignorieren – wir navigieren trotzdem zur Setup-Seite
    }
    this.router.navigate(['/terminal-setup']);
  }
}
