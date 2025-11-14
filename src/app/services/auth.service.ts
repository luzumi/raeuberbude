import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Simple authentication service storing a flag in localStorage.
 * Real user data is retrieved from the UserDbService which acts as our database.
 */
@Injectable( { providedIn: 'root' } )
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly apiBase: string;
  currentUser: any = null;

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.apiBase = `http://${host}:${port}`;
  }

  /**
   * Backend-Login gegen DB. Identifier = E-Mail oder Benutzername.
   */
  async login(identifier: string, password: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${this.apiBase}/users/login`, { identifier, password }, { withCredentials: true })
      );
      if (res?.data) {
        localStorage.setItem(this.tokenKey, 'logged_in');
        this.currentUser = res.data;
        return true;
      }
      return false;
    } catch (e) {
      console.error('AuthService.login failed', e);
      return false;
    }
  }

  /**
   * Registrierung mit anschließendem Setzen der Standardrolle (regular).
   */
  async register(email: string, username: string, password: string): Promise<boolean> {
    try {
      const reg: any = await firstValueFrom(
        this.http.post(`${this.apiBase}/users/register`, { email, username, password }, { withCredentials: true })
      );
      const user = reg?.data;
      if (!user?._id) return false;
      // Standardrechte setzen (regular). Upsert im Backend aktiv.
      await firstValueFrom(
        this.http.put(`${this.apiBase}/api/speech/rights/user/${user._id}`, { role: 'regular' }, { withCredentials: true })
      );
      // Optional: auto-login
      return await this.login(email, password);
    } catch (e) {
      console.error('AuthService.register failed', e);
      return false;
    }
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
    return this.currentUser?.username || '';
  }
}
