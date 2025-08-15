import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {UserDbService} from './user-db.service';

/**
 * Simple authentication service storing a flag in localStorage.
 * Real user data is retrieved from the UserDbService which acts as our database.
 */
@Injectable( { providedIn: 'root' } )
export class AuthService {
  private readonly tokenKey = 'auth_token';
  username: string = '';

  constructor(private readonly userDb: UserDbService, private readonly router: Router) {}

  /**
   * Attempts to authenticate the user and stores a token on success.
   */
  login(username: string, password: string): boolean {
    // TODO: Login loggen, zeit, name, id, erfolgreich, fehlgeschlagen
    const valid = this.userDb.validateUser( username, password );
    if ( valid ) {
      localStorage.setItem( this.tokenKey, 'logged_in' );
      this.username = username;
      return true;
    }
    return false;
  }

  /**
   * Returns true when the user has an active login token.
   */
  isLoggedIn(): boolean {
    return localStorage.getItem( this.tokenKey ) === 'logged_in';
  }

  /**
   * Entfernt das Login-Token und leitet zur Login-Seite weiter.
   */
  logout(): void {
    localStorage.removeItem( this.tokenKey );
    this.router.navigate( ['/login'] ); // zurück zum Login
  }

  getUserName(): string {
    return this.username;
  }
}
