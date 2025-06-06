import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Creator} from '../devices/features/control/devices/creator/creator';
import {Laptop} from '../devices/features/control/devices/laptop/laptop';
import {OrangeLight} from '../devices/features/control/devices/orange-light/orange-light';
import {Pixel} from '../devices/features/control/devices/pixel/pixel';
import {SamsungTv} from '../devices/features/control/devices/samsung-tv/samsung-tv';


interface Device {
  id: number;
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
  left: number; // Kreis‐Position (Default)
  top: number;  // Kreis‐Position (Default)
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Pixel,
    OrangeLight,
    Laptop,
    Creator,
    SamsungTv,
  ],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.scss']
})
export class DashboardComponent {
  devices: Device[] = [];
  activeIndex: number | null = null;

  private readonly radiusPercent = 30;
  private readonly center = 50;
  private readonly types: Device['type'][] = [
    'pixel',
    'orange-light',
    'laptop',
    'creator',
    'samsung-tv'
  ];

  constructor() {
    for (let i = 0; i < 5; i++) {
      const angleDeg = -90 + i * (360 / 5);
      const rad = (angleDeg * Math.PI) / 180;
      const left = this.center + Math.cos(rad) * this.radiusPercent;
      const top = this.center + Math.sin(rad) * this.radiusPercent;
      this.devices.push({
        id: i,
        type: this.types[i],
        left,
        top
      });
    }
  }

  onClick(idx: number) {
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  getStyle(device: Device, idx: number): { [key: string]: string } {
    // 1) Kein aktiviertes Gerät → Kreis-Layout (20% × 20%)
    if (this.activeIndex === null) {
      return {
        position: 'absolute',
        width: '20%',
        height: '20%',
        left: device.left + '%',
        top: device.top + '%',
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.3s ease',
        'z-index': '1'
      };
    }

    // 2) Dieses Gerät ist aktiv → 80% × 100%, rechts
    if (this.activeIndex === idx) {
      return {
        position: 'absolute',
        width: '80%',
        height: '100%',
        left: '20%',
        top: '0%',
        transition: 'all 0.3s ease',
        'z-index': '5'
      };
    }

    // 3) Inaktive Geräte (unterhalb des Buttons links)
    const inactiveIdx = this.getInactiveOrder(idx);
    const slicePercent = 22;    // vier Geräte unterhalb eines 20%-hohen Buttons
    const topPos = 20 + inactiveIdx * slicePercent;

    return {
      position: 'absolute',
      width: '20%',
      height: slicePercent + '%',
      left: '0%',
      top: topPos + '%',
      transition: 'all 0.3s ease',
      'z-index': '5'
    };
  }

  getColor(type: Device['type']): string {
    switch (type) {
      case 'pixel':
        return '#e74c3c';      // Rot
      case 'orange-light':
        return '#e67e22';      // Orange
      case 'laptop':
        return '#3498db';      // Blau
      case 'creator':
        return '#9b59b6';      // Violett
      case 'samsung-tv':
        return '#2ecc71';      // Grün
    }
  }

  getMenuStyle(): { [key: string]: string } {
    // Menü-Button: zentriert (10%) oder in der Ecke (8%) ...
    if (this.activeIndex === null) {
      return {
        position: 'absolute',
        width: '10%',
        height: '10%',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        'border-radius': '50%',
        transition: 'all 0.3s ease',
        'background-color': '#34495e',
        'z-index': '2'
      };
    } else {
      return {
        position: 'absolute',
        width: '8%',
        height: '8%',
        left: '-4%',
        top: '-4%',
        'border-radius': '50%',
        transition: 'all 0.3s ease',
        'background-color': '#34495e',
        'z-index': '3'
      };
    }
  }

  private getInactiveOrder(idx: number): number {
    const arr: number[] = [];
    this.devices.forEach((_, i) => {
      if (i !== this.activeIndex) {
        arr.push(i);
      }
    });
    return arr.indexOf(idx);
  }
}
