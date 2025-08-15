import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard blocks protected routes and leitet nicht eingeloggte Nutzer zum Login um
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true; // Zugriff erlaubt
  }
  router.navigate(['/login']); // Umleitung zur Login-Seite
  return false;
};
