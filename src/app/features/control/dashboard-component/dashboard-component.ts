import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

interface Device {
  id: number;
  color: string;
  left: number;
  top: number;
}

@Component( {
  selector: 'app-dashboard',
  standalone: true,             // ← zwingend nötig, damit @for/Syntax erkannt wird
  imports: [CommonModule],       // ← zwingend nötig, damit @for/NgIf/NgClass/NgStyle funktionieren
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.scss']
} )
export class DashboardComponent {
  devices: Device[] = [];
  activeIndex: number | null = null;

  private readonly radiusPercent = 30;
  private readonly center = 50;

  constructor() {
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
    for ( let i = 0; i < 5; i++ ) {
      const angleDeg = -90 + i * (360 / 5);
      const rad = (angleDeg * Math.PI) / 180;
      const left = this.center + Math.cos( rad ) * this.radiusPercent;
      const top = this.center + Math.sin( rad ) * this.radiusPercent;
      this.devices.push( { id: i, color: colors[i], left, top } );
    }
  }

  onClick(idx: number) {
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  getStyle(device: Device, idx: number): { [key: string]: string } {
    if (this.activeIndex === null) {
      // 1) Default: Kreis‐Layout wie gehabt (20% × 20%)
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

    if (this.activeIndex === idx) {
      // 2) Aktives Gerät: füllt rechts 80% Breite und 100% Höhe
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

    // 3) Inaktive: links gestapelt, jeweils 25% der Höhe
    const inactiveIdx = this.getInactiveOrder(idx);
    const slicePercent = 25; // 100 / 4
    const topPos = inactiveIdx * slicePercent;

    return {
      position: 'absolute',
      width: '20%',
      height: slicePercent + '%', // 25%
      left: '0%',
      top: topPos + '%',
      transition: 'all 0.3s ease',
      'z-index': '5'
    };
  }



  private getInactiveOrder(idx: number): number {
    const arr: number[] = [];
    this.devices.forEach( (_, i) => {
      if ( i !== this.activeIndex ) {
        arr.push( i );
      }
    } );
    return arr.indexOf( idx );
  }
}
