import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from '../../../shared/components/header/header.component';

/**
 * Landing page after login showing available rooms as a grid.
 */
@Component({
  selector: 'app-zuhause',
  standalone: true,
  // include header and material icons for room tiles
  imports: [CommonModule, RouterModule, HeaderComponent, MatIconModule],
  templateUrl: './zuhause-component.html',
  styleUrl: './zuhause-component.scss'
})
export class ZuhauseComponent {
  // Each room provides a label, an icon and optionally a navigation route.
  rooms = [
    { name: 'Wohnzimmer', icon: 'weekend' },
    { name: 'Schlafzimmer', icon: 'bed' },
    { name: 'Räuberbude', icon: 'sports_esports', route: '/raub1' },
    { name: 'Büro', icon: 'computer' },
    { name: 'Flur', icon: 'meeting_room' },
    { name: 'Bad', icon: 'bathtub' },
    { name: 'Küche', icon: 'kitchen' }
  ];
}
