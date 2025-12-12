import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {AuthService} from '@services/auth.service';
import {ConfigService} from '@services/config-service';
import {ActionDialogComponent} from '@shared/components/action-dialog/action-dialog.component';
import { HttpClientModule } from '@angular/common/http';
import { DeviceControlComponent } from './rooms/bedroom/device-control/device-control.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ActionDialogComponent, HttpClientModule, DeviceControlComponent],
  template: `
      <router-outlet></router-outlet>
      <app-device-control></app-device-control>
      <app-action-dialog></app-action-dialog>`,

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
