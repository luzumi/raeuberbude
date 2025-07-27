import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/rooms/rooms.routes').then(m => m.routes)
  },
  {
    path: 'control',
    loadChildren: () =>
      import('./features/control/control.routes').then(m => m.routes)
  }
];
