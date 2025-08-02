import { Injectable } from '@angular/core';

// AuthService verwaltet Benutzer und Login-Zustand über den LocalStorage
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usersKey = 'users';
  private readonly loggedInKey = 'loggedInUser';

  constructor() {
    // Datenbank (LocalStorage) beim ersten Start mit einem Standardnutzer befüllen
    if (!localStorage.getItem(this.usersKey)) {
      const defaultUsers = [{ username: 'admin', password: '1234' }];
      localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
    }
  }

  // Prüft Benutzername/Passwort und speichert Login bei Erfolg
  login(username: string, password: string): boolean {
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(this.loggedInKey, user.username);
      return true;
    }
    return false;
  }

  // Entfernt gespeicherten Login
  logout(): void {
    localStorage.removeItem(this.loggedInKey);
  }

  // Gibt zurück, ob ein Nutzer angemeldet ist
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.loggedInKey);
  }

  // Hilfsfunktion zum Lesen der Benutzer aus der "Datenbank"
  private getUsers(): { username: string; password: string }[] {
    return JSON.parse(localStorage.getItem(this.usersKey) ?? '[]');
  }
}
