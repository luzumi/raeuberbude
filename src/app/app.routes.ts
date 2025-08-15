import { Routes } from '@angular/router';
import {BudeComponent} from '@bude/bude-component/bude.component';
import { RoomMenuComponent } from './features/dashboard/room-menu/room-menu-component';
import { ZuhauseComponent } from '@rooms/zuhause_flur/zuhause-component/zuhause-component';
import { authGuard } from '@services/auth.guard';

export const routes: Routes = [
  // Home page shown after login
  {
    path: '',
    component: ZuhauseComponent,
    canActivate: [authGuard]
  },
  // Root route now displays the login page
  {
    path: 'raeuberbude',
   component: BudeComponent,
    canActivate: [authGuard]
  },
  // Previous root content moved to '/raub1'
  {
    path: 'raub1',
    component: RoomMenuComponent,
    canActivate: [authGuard]
  },
  // Original dashboard component now additionally reachable via '/raub2'
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@rooms/bude/bude-component/bude.component').then(
        m => m.BudeComponent
      ),
    canActivate: [authGuard]
  },
  {
    path: 'raub2',
    loadComponent: () =>
      import('@rooms/bude/bude-component/bude.component').then(
        m => m.BudeComponent
      ),
    canActivate: [authGuard]
  },
];
