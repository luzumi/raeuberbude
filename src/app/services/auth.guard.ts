import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TerminalService } from '../core/services/terminal.service';

// Guard blocks protected routes and leitet nicht eingeloggte Nutzer zum Login um
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const terminal = inject(TerminalService);

  // Require login first
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Allow terminal setup route itself
  if (state.url === '/terminal-setup') {
    return true;
  }

  // Ensure terminal is bound via cookie; if missing, redirect to setup
  try {
    const res = await terminal.getMyTerminal();
    if (!(res?.success && res.data)) {
      router.navigate(['/terminal-setup']);
      return false;
    }
  } catch (_) {
    // On error, still attempt to go to setup to repair
    router.navigate(['/terminal-setup']);
    return false;
  }

  return true;
};
