import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { LogoutButtonComponent } from '@shared/components/logout-button/logout-button';

/**
 * Landing page after login showing available rooms as a grid.
 */
@Component({
  selector: 'app-zuhause',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutButtonComponent, MatIcon, HeaderComponent],
  templateUrl: './zuhause-component.html',
  styleUrl: './zuhause-component.scss'
})
export class ZuhauseComponent implements OnInit {
  public userName: string = '';
  constructor(public auth: AuthService) {}

  public ngOnInit(): void {
    this.userName = this.auth.getUserName();
  }

  // Definition of all rooms to be rendered as buttons
  rooms = [
    { name: 'Wohnzimmer', icon: 'living' },
    { name: 'Schlafzimmer', icon: 'king_bed' },
    { name: 'Räuberbude', route: '/raub2', icon: 'single_bed' },
    { name: 'Küche', icon: 'chef_hat' },
    { name: 'Büro', icon: 'desktop_cloud_stack' },
    { name: 'Flur', icon: 'nest_multi_room' }
  ];

}
