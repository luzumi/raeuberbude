import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {AuthService} from '../../../services/auth.service';
import {LogoutButtonComponent} from "../../../shared/components/logout-button/logout-button";

/**
 * Landing page after login showing available rooms as a grid.
 */
@Component({
  selector: 'app-zuhause',
  standalone: true,
    imports: [CommonModule, RouterModule, LogoutButtonComponent],
  templateUrl: './zuhause-component.html',
  styleUrl: './zuhause-component.scss'
})
export class ZuhauseComponent {

  constructor(public auth: AuthService) {}
  // Definition of all rooms to be rendered as buttons in the desired order.
  // The 'Räuberbude' links to the classic dashboard at '/raub1'.
  rooms = [
    { name: 'Wohnzimmer' },
    { name: 'Schlafzimmer' },
    { name: 'Räuberbude', route: '/raub1' },
    { name: 'Büro' },
    { name: 'Flur' },
    { name: 'Bad' },
    { name: 'Küche' }
  ];
}
