import { Component, OnInit } from '@angular/core';
import { HomeAssistantWs } from '../../../core/home-assistant-ws';
import { MatCard } from '@angular/material/card';

/**
 * Displays a basic room selection menu and connects to the
 * Home Assistant WebSocket API on initialization.
 */
@Component({
  selector: 'app-room-menu',
  standalone: true,
  templateUrl: './room-menu.html',
  styleUrls: ['./room-menu.scss'],
  imports: [MatCard]
})
export class RoomMenuComponent implements OnInit {
  connected = false;

  constructor(private ws: HomeAssistantWs) {}

  ngOnInit(): void {
    // Start WebSocket connection and update status when a message arrives
    this.ws.messages$.subscribe({ next: () => (this.connected = true) });
    this.ws.connect();
  }
}
