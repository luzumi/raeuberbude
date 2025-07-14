import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button';
import { RoomEntityButton } from './room-entity-button';
import {FunctionMenuComponent} from './function-menu/function-menu';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [MatIconModule, AppButtonComponent, FunctionMenuComponent],
  templateUrl: './room-menu-component.html',
  styleUrls: ['./room-menu-component.scss'],
})
export class RoomMenuComponent implements OnInit {
  entities: RoomEntityButton[] = [];
  angles: string[] = [];
  targetDeltas: string[] = [];
  spinToDurations: string[] = [];

  selectedIndex = 0;
  selectedTargetDelta = '0deg';

  animateWheel = false;
  isAligning   = false;
  isFlying     = false;
  flightPhase  = false;

  ngOnInit() {
    this.initEntities();
    this.computeAngles();
    this.computeTargetDeltas();
    this.computeSpinToDurations();
  }

  private initEntities() {
    this.entities = [
      new RoomEntityButton('Light',       'lightbulb',     '#fdf0b3', '#fff066', false, 'assets/icons/light.svg'),
      new RoomEntityButton('Fire TV',     'tv',            '#fca97a', '#ffbe8f', false, 'assets/icons/firetv.svg'),
      new RoomEntityButton('Samsung TV',  'smart_display', '#b3d9f9', '#d3eaff', true,  'assets/icons/samsungtv.svg'),
      new RoomEntityButton('PC',          'computer',      '#bcddee', '#d7f1fb', false, 'assets/icons/pc.svg'),
      new RoomEntityButton('Laptop',      'laptop',        '#cfe4c3', '#e0f7c0', false, 'assets/icons/laptop.svg'),
      new RoomEntityButton('Pixel 8 Pro', 'smartphone',    '#fdc7a2', '#ffe0b7', false, 'assets/icons/pixel.svg'),
    ];
  }

  private computeAngles() {
    const n = this.entities.length;
    this.angles = this.entities.map((_, i) => `${-90 + (360 / n) * i}deg`);
  }

  private computeTargetDeltas() {
    const n = this.entities.length;
    const step = 360 / n;
    this.targetDeltas = this.entities.map((_, i) =>
      `${i === 0 ? 360 : step * i}deg`
    );
  }

  private computeSpinToDurations() {
    // 1 s für 360° → proportional
    this.spinToDurations = this.targetDeltas.map(d => {
      const deg = parseFloat(d);
      return `${(deg / 360).toFixed(3)}s`;
    });
  }

  toggleWheel() {
    this.animateWheel = !this.animateWheel;
    this.isAligning  = false;
    this.isFlying    = false;
    this.flightPhase = false;
  }

  handleEntityClick(i: number) {
    this.entities[i].active = true;
    // 1) stoppe Wheel
    this.animateWheel = false;
    this.selectedIndex       = i;
    this.selectedTargetDelta = this.targetDeltas[i];

    // 2) Align-Phase
    this.isAligning = true;
    this.isFlying   = false;
    this.flightPhase = false;
    const alignMs = parseFloat(this.spinToDurations[i]) * 1000;
    setTimeout(() => {
      this.isAligning = false;

      // 3) Flug-Phase starten
      this.isFlying = true;
      // flight duration aus CSS-Variable holen
      const flightDur = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--flight-dur')
      );
      const flightMs = flightDur * 1000;
      setTimeout(() => {
        this.isFlying    = false;
        this.flightPhase = true;
      }, flightMs);
    }, alignMs);
  }

  backFromFlight() {
    this.flightPhase = false;
    this.animateWheel = false;
    this.isAligning   = false;
    this.isFlying     = false;
    this.selectedIndex = 0;
  }
}
