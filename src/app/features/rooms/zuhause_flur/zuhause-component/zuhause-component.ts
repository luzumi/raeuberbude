import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';

/**
 * Landing page after login showing available rooms as a grid.
 */
@Component({
  selector: 'app-zuhause',
  standalone: true,
  imports: [CommonModule, RouterModule,  MatIcon, HeaderComponent],
  templateUrl: './zuhause-component.html',
  styleUrl: './zuhause-component.scss'
})
export class ZuhauseComponent implements OnInit {
  public userName: string = '';

  // Index der aktuell animierten Raumkachel
  public clickedIndex: number | null = null;

  constructor(public auth: AuthService, private readonly router: Router) {}

  public ngOnInit(): void {
    this.userName = this.auth.getUserName();
  }

  // Definition of all rooms to be rendered as buttons
  rooms = [
    { name: 'Wohnzimmer', icon: 'living' },
    { name: 'Schlafzimmer', icon: 'king_bed' },
    // Clicking the Räuberbude button navigates to its route
    { name: 'Räuberbude', route: '/raeuberbude', icon: 'single_bed' },
    { name: 'Küche', icon: 'chef_hat' },
    { name: 'Büro', icon: 'desktop_cloud_stack' },
    { name: 'Flur', icon: 'nest_multi_room' }
  ];

  /**
   * Startet die Klickanimation und navigiert nach kurzer Verzögerung zum Raum.
   */
  onRoomClick(index: number, route?: string): void {
    if (!route) {
      return; // Räume ohne Route sind deaktiviert
    }
    this.clickedIndex = index;
    setTimeout(() => this.router.navigateByUrl(route), 300);
  }

}
