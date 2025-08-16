import { Component, OnInit } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import {SamsungTvMinimal} from '@bude/devices/samsung-tv-parts/samsung-tv-minimal/samsung-tv-minimal';
import { AuthService } from '@services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { MenuComponent } from '@shared/components/menu/menu';
import { Creator } from '@rooms/bude/devices/creator/creator';
import { Laptop } from '@rooms/bude/devices/laptop/laptop';
import { OrangeLight } from '@rooms/bude/devices/orange-light/orange-light';
import { Pixel } from '@rooms/bude/devices/pixel/pixel';

interface Device {
  id: number;
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
  left: number;
  top: number;
}

@Component({
  selector: 'app-bude',
  standalone: true,
  // Alle benötigten UI-Bausteine des Raumes
  imports: [
    Pixel,
    OrangeLight,
    Laptop,
    Creator,
    MenuComponent,
    NgStyle,
    NgClass,
    HeaderComponent,
    SamsungTvMinimal,
    SamsungTvMinimal,
  ],
  templateUrl: './bude.component.html',
  styleUrls: ['./bude.component.scss']
})
export class BudeComponent implements OnInit {
  devices: Device[] = [];
  activeIndex: number | null = null;

  // Öffnungszustand des Menüs
  menuOpen = false;

  private readonly radiusPercent = 30;
  private readonly center = 50;
  private readonly types: Device['type'][] = [
    'pixel',
    'orange-light',
    'laptop',
    'creator',
    'samsung-tv'
  ];
  public userName: string = 'asd';

  constructor(
    private readonly auth: AuthService,
  ) {
    // Geräte kreisförmig verteilen
    for (let i = 0; i < 5; i++) {
      const angleDeg = -90 + (360 / 5) * i;
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

  ngOnInit(): void {
    this.userName = this.auth.getUserName();
  }

  onClick(idx: number) {
    // Wenn Gerät angeklickt, Menü schließen und Gerät aktivieren
    this.menuOpen = false;
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  onClickSamsung(idx: number) {
    // Samsung TV angeklickt, Menü schließen und Gerät aktivieren
    this.menuOpen = false;
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  onMenuButtonClick() {
    // Klick auf den Button: Menü öffnen, alle Geräte schließen
    this.activeIndex = null;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  /**
   * Inline-Styles für Geräte:
   * 1) Kein Gerät aktiv + kein Menü geöffnet → Kreis (20 % × 20 %).
   * 2) Gerät aktiv                    → 100 % × 80 % (links 0, top 20).
   * 3) Inaktive Geräte                → 20 %-Leiste oben nebeneinander.
   * 4) (Wenn Menü offen, Geräte unsichtbar: Breite/Höhe = 0)
   */
  getStyle(device: Device, idx: number): { [key: string]: string } {
    // 4) Wenn Menü offen, Geräte ausblenden
    if (this.menuOpen) {
      return {
        position: 'absolute',
        width: '0%',
        height: '0%',
        left: '0%',
        top: '0%',
        transition: 'all 0.3s ease',
        'z-index': '0'
      };
    }

    // 1) Kein Gerät aktiv → Kreis
    if (this.activeIndex === null) {
      return {
        position: 'absolute',
        width: '20%',
        height: '20%',
        left: `${device.left}%`,
        top: `${device.top}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.3s ease',
        'z-index': '1',
        'border-radius': '8px'
      };
    }

    // 2) Aktives Gerät → breite Fläche unterhalb der 20 %-Leiste
    if (this.activeIndex === idx) {
      return {
        position: 'absolute',
        width: '100%',  // füllt volle Breite
        height: '80%',  // unterhalb von top=20%
        left: '0%',
        top: '20%',
        transition: 'all 0.3s ease',
        'z-index': '5',
        'border-radius': '8px'
      };
    }

    // 3) Inaktive Geräte → in 20 %-Leiste oben nebeneinander
    const inactiveOrder = this.getInactiveOrder(idx); // 0..3
    const leftPercent = inactiveOrder * 20;            // 0 %,20 %,40 %,60 %
    return {
      position: 'absolute',
      width: '20%',
      height: '20%',
      left: `${leftPercent}%`,
      top: '0%',
      transition: 'all 0.3s ease',
      'z-index': '3',
      'border-radius': '8px'
    };
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

  getColor(type: Device['type']): string {
    switch (type) {
      case 'pixel':        return '#e74c3c';
      case 'orange-light': return '#e67e22';
      case 'laptop':       return '#3498db';
      case 'creator':      return '#9b59b6';
      case 'samsung-tv':   return '#2ecc71';
    }
  }

  /**
   * Erzeugt einen radialen Gradient für den übergebenen Gerätetyp,
   * damit die Kacheln farblich bleiben, aber stilistisch zur Roomübersicht passen.
   */
  getGradient(type: Device['type']): string {
    return this.gradientFrom(this.getColor(type));
  }

  /**
   * Hilfsfunktion zur Erstellung eines radialen Gradients auf Basis einer Farbe.
   */
  private gradientFrom(color: string): string {
    return `radial-gradient(circle at center, ${color}, rgba(0, 0, 0, 0.8))`;
  }

  /**
   * Inline-Styles für den Menü-Button selbst:
   * - Wenn Menü geschlossen und kein Gerät aktiv → 10 % × 10 % zentriert.
   * - Wenn Menü offen oder ein Gerät aktiv   → Button wie ein kleines Gerät in der Leiste oben.
   */
  getMenuStyle(): { [key: string]: string } {
    // 1) Menü geschlossen & kein Gerät aktiv → zentriert 10 % × 10 %
    if (!this.menuOpen && this.activeIndex === null) {
      return {
        position: 'absolute',
        width: '10%',
        height: '10%',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        'border-radius': '50%',
        transition: 'all 0.3s ease',
        background: this.gradientFrom('#34495e'),
        'z-index': '2'
      };
    }

    // 2) Sonst (Gerät aktiv oder Menü offen) → Button in 20 %-Leiste oben als 20 % × 20 %
    //    (kommt in dieselbe Leiste wie inaktive Geräte, ganz rechts: left=80%)
    return {
      position: 'absolute',
      width: '20%',
      height: '20%',
      left: '80%',   // ganz rechts in der Leiste
      top: '0%',
      'border-radius': '8px',  // eckig wie die Geräte
      transition: 'all 0.3s ease',
      background: this.gradientFrom('#34495e'),
      'z-index': '4'
    };
  }

  /**
   * Inline-Styles für die Menü-Komponente selbst:
   * (wird wie ein aktives Gerät unterhalb der 20 %-Leiste angezeigt)
   */
  getMenuComponentStyle(): { [key: string]: string } {
    return {
      position: 'absolute',
      width: '100%',
      height: '80%',
      left: '0%',
      top: '20%',
      transition: 'all 0.3s ease',
      'z-index': '5',
      'border-radius': '8px'
    };
  }
}
