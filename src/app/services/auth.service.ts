import { Injectable, Injector } from '@angular/core';
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

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly injector: Injector
  ) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.apiBase = `http://${host}:${port}`;

    // Versuche beim Start persistierte User-Informationen zu laden
    this.loadPersistedUser();

    // Falls bereits eingeloggt: SpeechService initialisieren (lazy)
    setTimeout(() => {
      const uid = this.getUserId();
      if (this.isLoggedIn() && uid) {
        this.initializeSpeechService(uid);
      }
    }, 0);
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
        // Persist user info for other services
        try {
          const serialized = JSON.stringify(this.currentUser);
          // store in both storages to cover different read paths
          localStorage.setItem('currentUser', serialized);
          sessionStorage.setItem('currentUser', serialized);
          // zusätzlich userId separat speichern (Backend verwendet häufig _id)
          const uid = this.currentUser?._id || this.currentUser?.id || null;
          if (uid) {
            localStorage.setItem('userId', uid);
            try { sessionStorage.setItem('userId', uid); } catch {}

            // SpeechService nach erfolgreichem Login initialisieren
            this.initializeSpeechService(uid);
          }
        } catch (e) {
          console.warn('Failed to persist currentUser in storage', e);
        }
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
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    try { sessionStorage.removeItem('currentUser'); } catch {}
    try { sessionStorage.removeItem('userId'); } catch {}
    this.currentUser = null;
    this.router.navigate( ['/login'] ); // zurück zum Login
  }

  getUserName(): string {
    return this.currentUser?.username || '';
  }

  // Neue Hilfs-API: sichere Getter für User / userId
  getUser(): any {
    return this.currentUser;
  }

  getUserId(): string | null {
    // bevorzugt aus currentUser, sonst aus Storage (falls nur userId gespeichert wurde)
    const uid = this.currentUser?._id || this.currentUser?.id || null;
    if (uid) return uid;
    try {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId');
    } catch { return null; }
  }

  // Hilfsmethode: beim Start gespeicherte Userdaten laden
  private loadPersistedUser(): void {
    try {
      let serialized = null;
      try { serialized = localStorage.getItem('currentUser'); } catch {}
      if (!serialized) {
        try { serialized = sessionStorage.getItem('currentUser'); } catch {}
      }
      if (serialized) {
        try {
          this.parsePersitedCurrentUser( serialized );
          return;
        } catch (e) {
          console.warn('AuthService: failed to parse persisted currentUser', e);
        }
      }

      // Fallback: es könnte nur 'userId' vorhanden sein
      try {
        const uid = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (uid) {
          this.currentUser = { _id: uid };
        }
      } catch { /* ignore */ }
    } catch (e) {
      console.warn('Failed to load persisted currentUser', e);
    }
  }

  private parsePersitedCurrentUser( serialized: string ): void {
    this.currentUser = JSON.parse( serialized );
    const uid = this.currentUser?._id || this.currentUser?.id || null;
    if ( uid ) {
      try { localStorage.setItem( 'userId', uid ); } catch {}
      try { sessionStorage.setItem( 'userId', uid ); } catch {}
    }
  }

  /**
   * Initialisiert SpeechService nach erfolgreichem Login
   * @param userId Die User-ID vom Backend
   */
  private initializeSpeechService(userId: string): void {
    console.log('[Auth] Preparing to initialize SpeechService for userId:', userId);

    // SpeechService lazy injecten und initialisieren
    import('../core/services/speech.service').then(module => {
      const speechService = this.injector.get(module.SpeechService);
      speechService.initializeAfterLogin(userId).catch((err: any) =>
        console.warn('[Auth] SpeechService initialization failed:', err)
      );
    }).catch((err: any) => {
      console.warn('[Auth] Could not load SpeechService:', err)
    });
  }
}
