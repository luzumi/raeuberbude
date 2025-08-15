import { Routes } from '@angular/router';
import { RoomMenuComponent } from './features/dashboard/room-menu/room-menu-component';
// Login & Zuhause components are new views introduced for authentication flow
import { LoginComponent } from './features/auth/login-component/login-component';
import { ZuhauseComponent } from './features/rooms/zuhause_flur/zuhause-component/zuhause-component';
// Guard to prevent access to protected routes without authentication
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  // Root route now displays the login page
  {
    path: '',
    component: LoginComponent
  },
  // After login the user lands on '/zuhause'
  {
    path: 'zuhause',
    component: ZuhauseComponent,
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
