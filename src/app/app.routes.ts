import { Routes } from '@angular/router';
import {RoomMenuComponent} from './features/dashboard/room-menu/room-menu-component';

export const routes: Routes = [
  {
    path: '',
    component: RoomMenuComponent
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/control/dashboard-component/dashboard-component').then(
        m => m.DashboardComponent
      )
  }
];
