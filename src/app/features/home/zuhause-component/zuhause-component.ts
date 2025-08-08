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

  // Room overview including icons; adds "Bad" and routes where available
  rooms = [
    { name: 'Wohnzimmer', icon: '🛋️' },
    { name: 'Schlafzimmer', icon: '🛏️' },
    { name: 'Räuberbude', icon: '🏴\u200d☠️', route: '/raub2' },
    { name: 'Büro', icon: '💻' },
    { name: 'Flur', icon: '🚪' },
    { name: 'Bad', icon: '🛁' },
    { name: 'Küche', icon: '🍳' }
  ];
}
