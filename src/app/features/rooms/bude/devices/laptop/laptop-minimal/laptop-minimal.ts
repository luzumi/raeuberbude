import { Component } from '@angular/core';

/**
 * Minimalansicht für das Laptop‑Gerät.
 */
@Component({
  selector: 'app-laptop-minimal',
  standalone: true,
  template: '<div class="device">Laptop</div>',
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class LaptopMinimal {}
