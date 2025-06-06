import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/control/dashboard-component/dashboard-component').then(m => m.DashboardComponent)
  },
  {
    path: 'lamp-toggle',
    loadComponent: () =>
      import('./features/control/lamp-toggle/lamp-toggle').then(m => m.LampToggleComponent)
  }
];
