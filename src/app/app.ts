import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ConfigService} from './services/config-service';
import {HeaderComponent} from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header [userName]="'User '"></app-header>
    <router-outlet></router-outlet>`,
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
}

