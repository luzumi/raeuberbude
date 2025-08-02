import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'raub2',
    pathMatch: 'full'
  },
  {
    // Route wurde von /dashboard nach /raub2 verschoben
    path: 'raub2',
    loadComponent: () =>
      import('./dashboard-component/dashboard-component').then(m => m.DashboardComponent)
  },
];
