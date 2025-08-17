import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';

// Minimalansicht des Samsung-TVs liegt nun im gleichen Ordner wie die Vollansicht
import { SamsungTvMinimal } from '@bude/devices/samsung-tv/samsung-tv-minimal/samsung-tv-minimal';
import { SamsungTv } from '@rooms/bude/devices/samsung-tv/samsung-tv/samsung-tv';
import { PixelMinimal } from '@rooms/bude/devices/pixel/pixel-minimal/pixel-minimal';
import { OrangeLightMinimal } from '@rooms/bude/devices/orange-light/orange-light-minimal/orange-light-minimal';
import { LaptopMinimal } from '@rooms/bude/devices/laptop/laptop-minimal/laptop-minimal';
import { CreatorMinimal } from '@rooms/bude/devices/creator/creator-minimal/creator-minimal';
import { AuthService } from '@services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { MenuComponent } from '@shared/components/menu/menu';
import { Creator } from '@rooms/bude/devices/creator/creator';
import { Laptop } from '@rooms/bude/devices/laptop/laptop';
import { OrangeLight } from '@rooms/bude/devices/orange-light/orange-light';
import { Pixel } from '@rooms/bude/devices/pixel/pixel';

interface Device {
  /**
   * Eindeutige ID des Geräts
   */
  id: number;
  /**
   * Typ des Geräts; bestimmt die zu verwendende Komponentenvariante
   */
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
}

@Component({
  selector: 'app-bude',
  standalone: true,
  // Alle benötigten UI-Bausteine des Raumes
  imports: [
    // Vollansichten
    Pixel,
    OrangeLight,
    Laptop,
    Creator,
    SamsungTv,
    // Minimalansichten für die Kreisübersicht
    PixelMinimal,
    OrangeLightMinimal,
    LaptopMinimal,
    CreatorMinimal,
    SamsungTvMinimal,
    // Allgemeine Bestandteile
    MenuComponent,
    NgClass,
    HeaderComponent,
  ],
  templateUrl: './bude.component.html',
  styleUrls: ['./bude.component.scss']
})
export class BudeComponent implements OnInit {
  devices: Device[] = [];
  activeIndex: number | null = null;

  // Öffnungszustand des Menüs
  menuOpen = false;

  // Gerätekacheln werden nun im Grid angezeigt; es sind keine
  // berechneten Kreispositionen mehr erforderlich
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
    // Geräteliste aufbauen; Positionen werden vom Grid übernommen
    this.types.forEach((type, i) => {
      this.devices.push({ id: i, type });
    });
  }

  ngOnInit(): void {
    this.userName = this.auth.getUserName();
  }

  /**
   * Generischer Klick-Handler für Gerätekacheln
   */
  onTileClick(idx: number) {
    // Menü schließen und angeklicktes Gerät aktivieren/deaktivieren
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

  // Layout-Logik für die Gerätekacheln erfolgt jetzt ausschließlich
  // über CSS-Klassen; die vorherigen Inline-Styles entfallen.

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
