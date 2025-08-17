import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '@shared/components/header/header.component';
import { AuthService } from '@services/auth.service';
import { PixelMinimal } from '@rooms/bude/devices/pixel/pixel-minimal/pixel-minimal';
import { OrangeLightMinimal } from '@rooms/bude/devices/orange-light/orange-light-minimal/orange-light-minimal';
import { LaptopMinimal } from '@rooms/bude/devices/laptop/laptop-minimal/laptop-minimal';
import { CreatorMinimal } from '@rooms/bude/devices/creator/creator-minimal/creator-minimal';
import { SamsungTvMinimal } from '@bude/devices/samsung-tv/samsung-tv-minimal/samsung-tv-minimal';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';

/**
 * Die Räuberbude stellt ihre Geräte nun ähnlich wie die Raumübersicht als Grid dar.
 * Für jedes Gerät wird die Minimalansicht angezeigt, die beim Klicken animiert.
 */
interface Device {
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
}

@Component({
  selector: 'app-bude',
  standalone: true,
  imports: [
    HeaderComponent,
    PixelMinimal,
    OrangeLightMinimal,
    LaptopMinimal,
    CreatorMinimal,
    SamsungTvMinimal,
    NgFor,
    NgSwitch,
    NgSwitchCase,
  ],
  templateUrl: './bude.component.html',
  styleUrls: ['./bude.component.scss']
})
export class BudeComponent implements OnInit {
  /** Geräte, die in der Räuberbude angezeigt werden */
  devices: Device[] = [
    { type: 'pixel' },
    { type: 'orange-light' },
    { type: 'laptop' },
    { type: 'creator' },
    { type: 'samsung-tv' }
  ];

  /** aktueller Benutzername zur Anzeige im Header */
  userName = '';

  constructor(private readonly auth: AuthService) {}

  ngOnInit(): void {
    // Benutzername aus dem AuthService auslesen
    this.userName = this.auth.getUserName();
  }
}
