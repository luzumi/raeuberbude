import { Routes } from '@angular/router';
import { BudeComponent } from '@bude/bude-component/bude.component';
import { ZuhauseComponent } from '@rooms/zuhause_flur/zuhause-component/zuhause-component';
import { authGuard } from '@services/auth.guard';
import { LoginComponent } from './features/auth/login-component/login-component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

export const routes: Routes = [
  {
    path: '',
    component: ZuhauseComponent,
    canActivate: [authGuard], // Startseite nur für eingeloggte Nutzer
  },
  {
    path: 'raeuberbude',
    component: BudeComponent,
    canActivate: [authGuard], // "Bude" ebenfalls geschützt
  },
  {
    path: 'login',
    component: LoginComponent, // Öffentlicher Login ohne Guard
  },
  {
    path: 'user-profile',
    component: UserProfileComponent,
    canActivate: [authGuard], // Nur für eingeloggte Nutzer
  },
  {
    path: '**',
    redirectTo: '', // Fallback leitet auf die Startseite
  },
];
