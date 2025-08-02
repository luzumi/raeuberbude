import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Neue Übersichtsseite mit Raum-Buttons
@Component({
  selector: 'app-zuhause',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './zuhause.component.html',
  styleUrls: ['./zuhause.component.scss']
})
export class ZuhauseComponent {
  // Liste der Räume; nur "Räuberbude" verlinkt zur Route raub2
  rooms = [
    { name: 'Wohnzimmer', link: null },
    { name: 'Schlafzimmer', link: null },
    { name: 'Räuberbude', link: '/raub2' },
    { name: 'Küche', link: null },
    { name: 'Büro', link: null },
    { name: 'Flur', link: null }
  ];
}
