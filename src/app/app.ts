import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './services/config-service';
import { LogoutButtonComponent } from './shared/components/logout-button/logout-button';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LogoutButtonComponent],
  template: `
    <!-- Logout-Button ist global verfügbar -->
    <app-logout-button *ngIf="auth.isLoggedIn()"></app-logout-button>
    <router-outlet></router-outlet>
  `,
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
  constructor(public auth: AuthService) {}
}
