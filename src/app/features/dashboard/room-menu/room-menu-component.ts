// src/app/features/dashboard/room-menu/room-menu-component.ts

import { Component, OnInit, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
// Für den Dashboard-Link
import { RouterLink } from '@angular/router';

import { AppButtonComponent } from '../../../shared/components/app-button/app-button';
import { HeaderComponent }  from '../../../shared/components/header/header.component';
import { RoomEntityButton } from './room-entity-button';
import { FunctionMenuComponent } from './function-menu/function-menu';

import { Pixel }         from '../../control/devices/features/control/devices/pixel/pixel';
import { OrangeLight }   from '../../control/devices/features/control/devices/orange-light/orange-light';
import { FiretvComponent } from '../../control/devices/features/control/devices/firetv/fire-tv-component';
import { SamsungTv }     from '../../control/devices/features/control/devices/samsung-tv/samsung-tv';
import { Creator }       from '../../control/devices/features/control/devices/creator/creator';
import { Laptop }        from '../../control/devices/features/control/devices/laptop/laptop';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    AppButtonComponent,
    HeaderComponent,
    FunctionMenuComponent,
    RouterLink
  ],
  templateUrl: './room-menu-component.html',
  styleUrls: ['./room-menu-component.scss'],
})
export class RoomMenuComponent implements OnInit {
  userName = 'Gast';

  entities: RoomEntityButton[] = [];
  angles: string[] = [];
  targetDeltas: string[] = [];
  spinToDurations: string[] = [];

  selectedIndex = -1;
  selectedTargetDelta = '0deg';

  animateWheel = false;
  isAligning   = false;
  isFlying     = false;
  flightPhase  = false;

  componentMappings: Record<string, Type<unknown>> = {
    Light:       OrangeLight,
    FireTV:      FiretvComponent,
    SamsungTV:   SamsungTv,
    PC:          Creator,
    Laptop:      Laptop,
    Pixel8Pro:   Pixel
  };

  ngOnInit(): void {
    this.initEntities();
    this.computeAngles();
    this.computeTargetDeltas();
    this.computeSpinToDurations();
  }

  private initEntities(): void {
    this.entities = [
      new RoomEntityButton('Light',      'lightbulb',     '#fdf0b3', '#fff066', false, 'assets/icons/light.svg'),
      new RoomEntityButton('FireTV',     'tv',            '#fca97a', '#ffbe8f', false, 'assets/icons/firetv.svg'),
      new RoomEntityButton('SamsungTV',  'smart_display', '#b3d9f9', '#d3eaff', true,  'assets/icons/samsungtv.svg'),
      new RoomEntityButton('PC',         'computer',      '#bcddee', '#d7f1fb', false, 'assets/icons/pc.svg'),
      new RoomEntityButton('Laptop',     'laptop',        '#cfe4c3', '#e0f7c0', false, 'assets/icons/laptop.svg'),
      new RoomEntityButton('Pixel8Pro',  'smartphone',    '#fdc7a2', '#ffe0b7', false, 'assets/icons/pixel.svg')
    ];
  }

  private computeAngles(): void {
    const n = this.entities.length;
    this.angles = this.entities.map((_, i) => `${-90 + (360 / n) * i}deg`);
  }

  private computeTargetDeltas(): void {
    const n = this.entities.length;
    const step = 360 / n;
    this.targetDeltas = this.entities.map((_, i) =>
      `${i === 0 ? 360 : step * i}deg`
    );
  }

  private computeSpinToDurations(): void {
    this.spinToDurations = this.targetDeltas.map(d => {
      const deg = parseFloat(d);
      return `${(deg / 360).toFixed(3)}s`;
    });
  }

  toggleWheel(): void {
    this.animateWheel  = !this.animateWheel;
    this.isAligning    = false;
    this.isFlying      = false;
    this.flightPhase   = false;
    this.selectedIndex = -1;
  }

  handleEntityClick(i: number): void {
    // Wenn in Phase 4 direkt ein Header-Button gedrückt wird:
    if (this.flightPhase && this.selectedIndex !== i) {
      this.selectedIndex = i;
      return;
    }

    // Wheel stoppen, Ausrichtung starten
    this.entities[i].active = true;
    this.animateWheel       = false;
    this.selectedIndex      = i;
    this.selectedTargetDelta = this.targetDeltas[i];
    this.isAligning         = true;

    const alignMs = parseFloat(this.spinToDurations[i]) * 1000;
    setTimeout(() => {
      this.isAligning = false;
      this.isFlying   = true;

      const flightDur = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--flight-dur')
      );
      setTimeout(() => {
        this.isFlying    = false;
        this.flightPhase = true;
      }, flightDur * 1000);
    }, alignMs);
  }

  backFromFlight(): void {
    this.flightPhase   = false;
    this.isFlying      = false;
    this.isAligning    = false;
    this.animateWheel  = false;
    this.selectedIndex = -1;
  }

  get activeEntityComponent(): Type<unknown> | null {
    if (this.flightPhase && this.selectedIndex >= 0) {
      const name = this.entities[this.selectedIndex].name;
      return this.componentMappings[name] ?? null;
    }
    return null;
  }
}
