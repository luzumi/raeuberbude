// src/app/shared/components/header/header.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../app-button/app-button';
import { RoomEntityButton } from '../../../features/dashboard/room-menu/room-entity-button';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  /** Name des aktuellen Nutzers */
  @Input() userName: string = 'Gast';

  /** Steuert, ob Phase 4 (Detail-Ansicht) aktiv ist */
  @Input() flightPhase: boolean = false;

  /** Liste aller Entities für die Button-Leiste */
  @Input() entities: RoomEntityButton[] = [];

  /** Event, um das Wheel zu togglen */
  @Output() toggleWheel = new EventEmitter<void>();

  /** Event, wenn ein Entity-Button im Header geklickt wird */
  @Output() entityClick = new EventEmitter<number>();

  /** Event für den Zurück-Button */
  @Output() back = new EventEmitter<void>();

  /** Service zum Verwalten der Authentifizierung */
  private auth = inject(AuthService);

  /** Methode: Menu-Icon anklicken */
  onToggleMenu(): void {
    this.toggleWheel.emit();
  }

  /** Methode: Entity-Button im Header anklicken */
  onEntityClick(index: number): void {
    this.entityClick.emit(index);
  }

  /** Methode: Zurück-Button anklicken */
  onBack(): void {
    this.back.emit();
  }

  /**
   * Klick auf den Logout-Button: beendet die Sitzung und leitet auf die Login-Seite um.
   */
  logout(): void {
    this.auth.logout();
  }

  /** Tageszeiten-Begrüßung */
  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }
}
