import { Routes } from '@angular/router';
import { LampToggleComponent } from './lamp-toggle/lamp-toggle';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard-component/dashboard-component').then(m => m.DashboardComponent)
  },
  {
    path: 'lamp-toggle',
    component: LampToggleComponent
  }
];
