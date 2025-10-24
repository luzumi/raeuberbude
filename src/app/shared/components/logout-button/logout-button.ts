// src/app/shared/components/logout-button/logout-button.ts

import {Component, Input} from '@angular/core';
import { AppButtonComponent } from '../app-button/app-button';
import { AuthService } from '../../../services/auth.service';

/**
 * Fester Logout-Button, der auf allen Seiten erreichbar ist.
 */
@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [AppButtonComponent],
  templateUrl: './logout-button.html',
  styleUrls: ['./logout-button.scss']
})
export class LogoutButtonComponent {
  @Input() size: string = '2.5rem';
  constructor(private readonly auth: AuthService) {}

  /**
   * Meldet den aktuellen Nutzer ab und leitet zur Login-Seite um.
   */
  logout(): void {
    this.auth.logout();
  }
}
