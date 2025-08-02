import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserDbService } from './user-db.service';

/**
 * Simple authentication service storing a flag in localStorage.
 * Real user data is retrieved from the UserDbService which acts as our database.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth_token';

  constructor(private userDb: UserDbService, private router: Router) {}

  /**
   * Attempts to authenticate the user and stores a token on success.
   */
  login(username: string, password: string): boolean {
    const valid = this.userDb.validateUser(username, password);
    if (valid) {
      localStorage.setItem(this.tokenKey, 'logged_in');
      return true;
    }
    return false;
  }

  /**
   * Returns true when the user has an active login token.
   */
  isLoggedIn(): boolean {
    return localStorage.getItem(this.tokenKey) === 'logged_in';
  }

  /**
   * Clears the login token and navigates back to the login page.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/']);
  }
}
