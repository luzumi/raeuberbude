import {Component} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {AppButtonComponent} from '../../../shared/components/app-button/app-button';
import {FunctionMenuComponent} from './function-menu/function-menu';
import {RoomEntityButton} from './room-entity-button';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [
    MatIconModule,
    AppButtonComponent,
    FunctionMenuComponent,

  ],
  templateUrl: './room-menu-component.html',
  styleUrls: ['./room-menu-component.scss']
})
export class RoomMenuComponent {
  entities: RoomEntityButton[] = [];
  menuEntity = new RoomEntityButton(
    'Menu', 'settings', '#f89e3d', '#fdb65c', false, 'assets/icons/menu.svg'
  );
  menuVisible = false;

  selectedEntity: RoomEntityButton | null = null;
  sidebarItems: RoomEntityButton[] = [];

  /** Steiner für Animation beim ersten Mal */
  spinDurations: number[] = [];  // in Sekunden
  animateSequence = false;

  constructor() {
    this.initEntities();
    this.arrangeCircular();
    this.computeSpinDurations(6); // Beispiel: 6 s für volle Umdrehung
  }

  private initEntities() {
    this.entities = [
      new RoomEntityButton('Light', 'lightbulb', '#fdf0b3', '#fff066', false, 'assets/icons/light.svg'),
      new RoomEntityButton('Fire TV', 'tv', '#fca97a', '#ffbe8f', false, 'assets/icons/firetv.svg'),
      new RoomEntityButton('Samsung TV', 'smart_display', '#b3d9f9', '#d3eaff', true, 'assets/icons/samsungtv.svg'),
      new RoomEntityButton('PC', 'computer', '#bcddee', '#d7f1fb', false, 'assets/icons/pc.svg'),
      new RoomEntityButton('Laptop', 'laptop', '#cfe4c3', '#e0f7c0', false, 'assets/icons/laptop.svg'),
      new RoomEntityButton('Pixel 8 Pro', 'smartphone', '#fdc7a2', '#ffe0b7', false, 'assets/icons/pixel.svg'),
    ];
  }

  private arrangeCircular() {
    const center = 50, radius = 33;
    this.entities.forEach((e, i) => {
      const deg = -90 + (360 / this.entities.length) * i;
      e.left = center + Math.cos(deg * Math.PI / 180) * radius;
      e.top = center + Math.sin(deg * Math.PI / 180) * radius;
    });
  }

  onMenuClick() {
    this.menuVisible = !this.menuVisible;
  }

  openEntity(entity: RoomEntityButton) {
    if (!this.selectedEntity && !this.animateSequence) {
      this.animateSequence = true;
      // vorher 1200 → jetzt auf 1400 (0.8 + 0.6)
      setTimeout(() => {
        this.animateSequence = false;
        this.sidebarItems = [...this.entities];
        this.selectedEntity = entity;
      }, 1400);
      return;
    }
    if (this.selectedEntity === entity) {
      this.closeEntity();
    } else {
      this.selectedEntity = entity;
    }
  }


  closeEntity() {
    this.selectedEntity = null;
    this.sidebarItems = [];
    this.menuVisible = false;
    this.arrangeCircular();
  }

  closeFunctionMenu() {
    this.menuVisible = false;
  }

  private computeSpinDurations(fullSpinSeconds: number) {
    this.spinDurations = this.entities.map((_, i) => {
      // Startwinkel in Grad: -90 + i * (360 / n)
      const startDeg = -90 + (360 / this.entities.length) * i;
      // ∆ gegen Uhrzeigersinn bis -90
      const delta = (startDeg - (-90) + 360) % 360;
      return (delta / 360) * fullSpinSeconds;
    });
  }
}
