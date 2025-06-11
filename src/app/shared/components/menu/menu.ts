// src/app/features/control/menu/menu.component.ts
import {Component, Input} from '@angular/core';

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
  // Der Dashboard-Parent setzt diese Funktion per @Output oder Callback.
  @Input() closeCallback!: OmitThisParameter<() => void>;

  close() {
    this.closeCallback();
  }
}
