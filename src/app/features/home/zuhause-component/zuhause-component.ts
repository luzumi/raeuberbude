import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button';

/**
 * Landing page after login showing available rooms as a grid.
 */
@Component({
  selector: 'app-zuhause',
  standalone: true,
  // Home overview uses Material icons and logout button
  imports: [CommonModule, RouterModule, MatIconModule, LogoutButtonComponent],
  templateUrl: './zuhause-component.html',
  styleUrl: './zuhause-component.scss'
})
export class ZuhauseComponent {

  constructor(public auth: AuthService) {}

  /**
   * Definition of all rooms rendered as cards on the landing page.
   * When a route is provided the card becomes a link; otherwise it is disabled.
   */
  rooms = [
    { name: 'Wohnzimmer',   icon: 'weekend' },
    { name: 'Schlafzimmer', icon: 'bed' },
    // Route to the advanced room menu found under '/raub2'
    { name: 'Räuberbude',   icon: 'cottage', route: '/raub2' },
    { name: 'Büro',         icon: 'work' },
    { name: 'Flur',         icon: 'door_front' },
    { name: 'Bad',          icon: 'bathroom' },
    { name: 'Küche',        icon: 'restaurant' }
  ];
}
