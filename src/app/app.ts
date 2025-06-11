import {APP_INITIALIZER, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ConfigService} from './services/config-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<h1>Räuberbude</h1><router-outlet></router-outlet>`,
providers: [
  {
    provide: APP_INITIALIZER,
    useFactory: (config: ConfigService) => () => config.load(),
    deps: [ConfigService],
    multi: true
  }
]
})
export class AppComponent {}

