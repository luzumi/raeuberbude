import { Injectable } from '@angular/core';

// Interface describing our user data structure
interface User {
  username: string;
  password: string;
}

/**
 * Naive user database using localStorage for persistence.
 * This simulates a real database for the demo.
 */
@Injectable({ providedIn: 'root' })
export class UserDbService {
  private readonly storageKey = 'users';

  constructor() {
    // Pre-populate the "database" with a default user on first load
    const users = localStorage.getItem(this.storageKey);
    if (!users) {
      const defaultUsers: User[] = [
        { username: 'admin', password: 'secret' }
      ];
      localStorage.setItem(this.storageKey, JSON.stringify(defaultUsers));
    }
  }

  /**
   * Checks if a user with the given credentials exists in storage.
   */
  validateUser(username: string, password: string): boolean {
    const users: User[] = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    return users.some((u: User) => u.username === username && u.password === password);
  }
}
