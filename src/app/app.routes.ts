import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'control',
    pathMatch: 'full'
  },
  {
    path: 'control',
    loadChildren: () =>
      import('./features/control/control.routes').then(m => m.routes)
  }
];
