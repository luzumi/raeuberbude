import { Routes } from '@angular/router';
import { BudeComponent } from '@bude/bude-component/bude.component';
import { ZuhauseComponent } from '@rooms/zuhause_flur/zuhause-component/zuhause-component';
import { authGuard } from '@services/auth.guard';
import {AdminAreasComponent} from './features/admin/areas/admin-areas.component';
import {AdminRolesComponent} from './features/admin/roles/admin-roles.component';
import { LoginComponent } from './features/auth/login-component/login-component';
import { MenuComponent } from '@shared/components/menu/menu';
import { UserProfileComponent } from '@components/user-profile/user-profile.component';
import { TerminalSetupComponent } from './features/terminal/terminal-setup.component';
import { RightsManagementComponent } from './features/admin/rights-management/rights-management.component';
import { AdminUsersComponent } from './features/admin/users/admin-users.component';

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
    path: 'terminal-setup',
    component: TerminalSetupComponent,
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
    path: 'user-profile',
    component: UserProfileComponent,
    canActivate: [authGuard], // Nur für eingeloggte Nutzer
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'rechte', pathMatch: 'full' },
      { path: 'rechte', component: RightsManagementComponent },
      { path: 'terminals', component: RightsManagementComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'bereiche', component: AdminAreasComponent },
      { path: 'rollen', component: AdminRolesComponent },
      // Legacy/Memory alias
      { path: 'rights-management', redirectTo: 'rechte' },
    ],
  },
  {
    path: '**',
    redirectTo: '', // Fallback leitet auf die Startseite
  },
];
