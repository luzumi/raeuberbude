import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@services/auth.service';

/**
 * Einfache Profilseite für den eingeloggten Nutzer.
 */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent {
  constructor(public auth: AuthService) {}
}

