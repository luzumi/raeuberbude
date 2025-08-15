import { Component, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

/**
 * Wrapper component that lazy loads individual room components
 * based on the id parameter (e.g. '/rooms/bude').
 */
@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [NgComponentOutlet],
  template: '<ng-container *ngComponentOutlet="component"></ng-container>'
})
export class RoomsComponent {
  component: Type<unknown> | null = null;

  constructor(private readonly route: ActivatedRoute) {
    // Listen to route changes and dynamically import the room component
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      switch (id) {
        case 'bude':
          const bude = await import('@rooms/bude/bude-component/bude.component');
          this.component = bude.BudeComponent;
          break;
        case 'zuhause':
          const home = await import('@rooms/zuhause_flur/zuhause-component/zuhause-component');
          this.component = home.ZuhauseComponent;
          break;
        default:
          this.component = null; // unknown room id
      }
    });
  }
}
