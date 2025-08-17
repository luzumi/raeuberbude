import {NgClass} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {SamsungTv} from '@bude/devices/samsung-tv/samsung-tv/samsung-tv';

// Minimalansichten der Geräte
import { PixelMinimal } from '@rooms/bude/devices/pixel/pixel-minimal/pixel-minimal';
import { OrangeLightMinimal } from '@rooms/bude/devices/orange-light/orange-light-minimal/orange-light-minimal';
import { LaptopMinimal } from '@rooms/bude/devices/laptop/laptop-minimal/laptop-minimal';
import { CreatorMinimal } from '@rooms/bude/devices/creator/creator-minimal/creator-minimal';
import { SamsungTvMinimal } from '@bude/devices/samsung-tv/samsung-tv-minimal/samsung-tv-minimal';
import { MenuMinimal } from '@shared/components/menu/menu-minimal';
import { AuthService } from '@services/auth.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { MenuComponent } from '@shared/components/menu/menu';
import { Creator } from '@rooms/bude/devices/creator/creator';
import { Laptop } from '@rooms/bude/devices/laptop/laptop';
import { OrangeLight } from '@rooms/bude/devices/orange-light/orange-light';
import { Pixel } from '@rooms/bude/devices/pixel/pixel';

interface Device {
  /** Eindeutige ID der Gerätekachel. */
  id: number;
  /** Gerätetyp bestimmt Komponente und Farbe. */
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
}

@Component({
  selector: 'app-bude',
  standalone: true,
  // Alle benötigten UI-Bausteine des Raumes
  imports: [
    PixelMinimal,
    OrangeLightMinimal,
    LaptopMinimal,
    CreatorMinimal,
    SamsungTvMinimal,
    MenuMinimal,
    HeaderComponent,
    NgClass,
    MenuComponent,
    Pixel,
    OrangeLight,
    Laptop,
    Creator,
    SamsungTv,
  ],
  templateUrl: './bude.component.html',
  styleUrls: ['./bude.component.scss']
})
export class BudeComponent implements OnInit {
  /** Alle in der Bude verfügbaren Geräte. */
  devices: Device[] = [
    { id: 0, type: 'pixel' },
    { id: 1, type: 'orange-light' },
    { id: 2, type: 'laptop' },
    { id: 3, type: 'creator' },
    { id: 4, type: 'samsung-tv' },
  ];

  /** Index des aktuell geöffneten Geräts; `null` zeigt die Grid-Übersicht. */
  activeIndex: number | null = null;

  /** Öffnungszustand des Menüs. */
  menuOpen = false;

  public userName: string = 'asd';

  constructor(
    private readonly auth: AuthService,
  ) {}

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
   * Wird von den Gerätedetails aufgerufen, um zur Übersicht zurückzukehren.
   */
  onBack(): void {
    this.activeIndex = null;
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
   * Farbverlauf für die Menü-Kachel.
   */
  getMenuGradient(): string {
    return this.gradientFrom('#34495e');
  }
}
