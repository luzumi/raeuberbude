import { Routes } from '@angular/router';
import { BudeComponent } from '@bude/bude-component/bude.component';
import { ZuhauseComponent } from '@rooms/zuhause_flur/zuhause-component/zuhause-component';
import { authGuard } from '@services/auth.guard';
import { LoginComponent } from './features/auth/login-component/login-component';
import { MenuComponent } from '@shared/components/menu/menu';
import { UserProfileComponent } from '@components/user-profile/user-profile.component';

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
    path: 'menu',
    component: MenuComponent,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'login',
    component: LoginComponent, // Öffentlicher Login ohne Guard
  },
  {
    path: '**',
    redirectTo: '', // Fallback leitet auf die Startseite
  },
];
