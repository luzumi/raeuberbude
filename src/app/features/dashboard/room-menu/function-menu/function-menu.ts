import {Component, Input, Output, EventEmitter, OnInit} from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import {RoomEntityButton} from '../room-entity-button';

@Component({
  selector: 'app-function-menu',
  standalone: true,
  imports: [NgStyle, MatIconModule],
  templateUrl: './function-menu.html',
  styleUrl: './function-menu.scss'
})
export class FunctionMenuComponent implements OnInit {
  @Input() entity!: RoomEntityButton;
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
  @Output() close = new EventEmitter<void>();

  buttons = [
    { icon: 'power_settings_new', label: 'Toggle' },
    { icon: 'settings', label: 'Settings' },
    { icon: 'info', label: 'Info' }
  ];

  ngOnInit() {

  }

  get startAngle(): number {
    const sector = 0;
    // 8 Sektoren: 0–7 → je 45°
    // Jede Ausrichtung bekommt einen Startwinkel für 120°
    const map = [210, 240, 270, 300, 330, 0, 30, 60];
    return map[sector] ?? 0;
  }
}
