import {Component,} from '@angular/core';
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
  styleUrl: './room-menu-component.scss'
})
export class RoomMenuComponent {
  entities: RoomEntityButton[] = [];
  menuEntity: RoomEntityButton = new RoomEntityButton(
    'Menu',
    'settings',
    '#f89e3d',
    '#fdb65c',
    false,
    'assets/icons/menu.svg'
  );
  menuPosition= { x:0, y:0 };
  menuVisible: boolean = false;
  /** Die aktuell geöffnete Entity (null = keine geöffnet) */
  selectedEntity: RoomEntityButton | null = null;
  /** Positionsdaten für das „Sidebar“-Layout */
  sidebarItems: RoomEntityButton[] = [];

  constructor() {
    const center = 50;
    const radius = 48;

    const rawEntities = [
      new RoomEntityButton('Light', 'lightbulb', '#fdf0b3', '#fff066', false, 'assets/icons/light.svg'),
      new RoomEntityButton('Fire TV', 'tv', '#fca97a', '#ffbe8f', false, 'assets/icons/firetv.svg'),
      new RoomEntityButton('Samsung TV', 'smart_display', '#b3d9f9', '#d3eaff', true, 'assets/icons/samsungtv.svg'),
      new RoomEntityButton('PC', 'computer', '#bcddee', '#d7f1fb', false, 'assets/icons/pc.svg'),
      new RoomEntityButton('Laptop', 'laptop', '#cfe4c3', '#e0f7c0', false, 'assets/icons/laptop.svg'),
      new RoomEntityButton('Pixel 8 Pro', 'smartphone', '#fdc7a2', '#ffe0b7', false , 'assets/icons/pixel.svg')
    ];

    rawEntities.forEach((entity, i) => {
      const angleDeg = -90 + (360 / rawEntities.length) * i;
      const rad = (angleDeg * Math.PI) / 180;
      entity.left = center + Math.cos(rad) * radius;
      entity.top = center + Math.sin(rad) * radius;

      this.entities.push(entity); // nur hier pushen!
    });
  }

  onMenuClick() {
    this.menuVisible = !this.menuVisible;
  }

  openEntity(entity: RoomEntityButton) {
    if (this.selectedEntity === entity) {
      // nochmal draufgeklickt → wieder schließen
      this.closeEntity();
      return;
    }

    this.selectedEntity = entity;
    this.sidebarItems = this.entities
      .filter(e => e !== entity)
      // Menü-Button an zweiter Stelle (/ oberhalb der restlichen)
      .sort((a, b) => a === this.menuEntity ? -1 : b === this.menuEntity ? 1 : 0);

    // Positionsberechnung für Sidebar-Icons
    this.sidebarItems.forEach((e, i) => {
      // Abstand von oben in Prozent: 10 % + i · 12 %
      e.top = 10 + i * 12;
      // links immer z.B. 8 %
      e.left = 8;
    });
  }

  // schließt die geöffnete Entity und resettet
  closeEntity() {
    this.selectedEntity = null;
    // optional: sidebarItems leeren oder zurücksetzen
    this.sidebarItems = [];
  }

  closeFunctionMenu() {

  }
}
