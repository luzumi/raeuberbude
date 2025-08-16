// Verschoben aus den Control-Features in den Shared-Bereich
import {Component, Input} from '@angular/core';
import {Location} from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  template: `
    <div class="menu-container">
      <h2>Menü</h2>
      <!-- Platzhalter‐Inhalt -->
      <p>Hier stehen später die Menü‐Einträge.</p>
      <button (click)="close()">Schließen</button>
    </div>
  `,
  styles: [`
    .menu-container {
      width: 100%;
      height: 100%;
      background-color: #ecf0f1;
      border-radius: 8px;
      box-sizing: border-box;
      padding: 1rem;
    }
    h2 {
      margin-top: 0;
    }
  `]
})
export class MenuComponent {
  /**
   * Optionales Callback, das vom Parent gesetzt werden kann,
   * um das Menü zu schließen. Ist keins definiert, geht es eine Seite zurück.
   */
  @Input() closeCallback?: OmitThisParameter<() => void>;

  constructor(private readonly location: Location) {}

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
}
