import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login-component/login-component';
import { authGuard } from './services/auth.guard';

/**
 * Application wide routes.
 * Components under 'components/' are lazy loaded to reduce bundle size.
 */
export const routes: Routes = [
  // Public route for login
  {
    path: 'login',
    component: LoginComponent
  },
  // Home page shown after login
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  // Global settings
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  // Dynamic room route: '/rooms/bude', '/rooms/zuhause', ...
  {
    path: 'rooms/:id',
    loadComponent: () =>
      import('./components/rooms/rooms.component').then(m => m.RoomsComponent),
    canActivate: [authGuard]
  },
  // Fallback redirects unknown paths to home
  { path: '**', redirectTo: '' }
];
