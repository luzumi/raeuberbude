import { Routes } from '@angular/router';
import { RoomMenuComponent } from './features/dashboard/room-menu/room-menu-component';
import { LoginComponent } from './features/login/login.component';
import { ZuhauseComponent } from './features/zuhause/zuhause.component';
import { authGuard } from './services/auth.guard';

// Haupt-Routing der Anwendung
export const routes: Routes = [
  // Login auf der Startseite
  { path: '', component: LoginComponent },
  // Nach erfolgreichem Login landet der Nutzer auf der Zuhause-Seite
  { path: 'zuhause', component: ZuhauseComponent, canActivate: [authGuard] },
  // Ehemaliger Root-Inhalt jetzt unter /raub1 erreichbar
  { path: 'raub1', component: RoomMenuComponent, canActivate: [authGuard] },
  // Dashboard-Komponente (früher /dashboard) jetzt unter /raub2
  {
    path: 'raub2',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/control/dashboard-component/dashboard-component').then(
        m => m.DashboardComponent
      )
  }
];
