import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './services/config-service';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <!-- Globaler Header mit Logout, nur sichtbar wenn eingeloggt -->
    <app-header *ngIf="auth.isLoggedIn()"></app-header>
    <!-- Offset damit der Inhalt nicht vom Header verdeckt wird -->
    <div [style.marginTop.px]="auth.isLoggedIn() ? 80 : 0">
      <router-outlet></router-outlet>
    </div>`,
  providers: [
    {
      provide: 'root',
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService],
      multi: true
    }
  ]
})
export class AppComponent {
  /** AuthService wird benötigt, um den Login-Status im Template zu prüfen */
  protected auth = inject(AuthService);
}

