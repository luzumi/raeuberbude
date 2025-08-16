import { Component } from '@angular/core';

/**
 * Minimalansicht für das Fire‑TV‑Gerät.
 */
@Component({
  selector: 'app-firetv-minimal',
  standalone: true,
  template: '<div class="device">Fire TV</div>',
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class FiretvMinimal {}
