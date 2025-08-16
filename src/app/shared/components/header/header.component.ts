// src/app/shared/components/header/header.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule, NgOptimizedImage, Location } from '@angular/common';
import { Router } from '@angular/router';
import { AppButtonComponent } from '../app-button/app-button';
import { LogoutButtonComponent } from '../logout-button/logout-button';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    LogoutButtonComponent,
    NgOptimizedImage
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  /** Name des aktuellen Nutzers */
  @Input() userName: string = 'Gast';

  constructor(private readonly router: Router, private readonly location: Location) {}

  /**
   * Navigiert zur Profilseite des Nutzers.
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Öffnet die Menüseite.
   */
  goToMenu(): void {
    this.router.navigate(['/menu']);
  }

  /**
   * Navigiert zur vorherigen Seite.
   */
  goBack(): void {
    this.location.back();
  }

  /** Tageszeiten-Begrüßung */
  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }
}
