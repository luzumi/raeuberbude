import { Component } from '@angular/core';

/**
 * Minimale Darstellung des Orange‑Light‑Geräts.
 */
@Component({
  selector: 'app-orange-light-minimal',
  standalone: true,
  template: '<div class="device">Orange Light</div>',
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class OrangeLightMinimal {}
