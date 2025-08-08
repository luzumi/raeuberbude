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
  // Definition of all rooms to be rendered as buttons
  rooms = [
    { name: 'Wohnzimmer' }, // Living room
    { name: 'Schlafzimmer' }, // Bedroom
    { name: 'Räuberbude', route: '/raub2' }, // Link to the original dashboard
    { name: 'Büro' }, // Office
    { name: 'Flur' }, // Hallway
    { name: 'Bad' }, // Bathroom
    { name: 'Küche' } // Kitchen
  ];
}
