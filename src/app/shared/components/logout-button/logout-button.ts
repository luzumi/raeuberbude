import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth.service';

/**
 * Small reusable logout button that triggers the AuthService.
 * The template is intentionally simple to keep tests light-weight.
 */
@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule],
  template: `<button (click)="auth.logout()" [style.fontSize]="size">Logout</button>`,
})
export class LogoutButtonComponent {
  /** Allows consumers to set the font-size of the button */
  @Input() size = '1rem';

  constructor(public auth: AuthService) {}
}
