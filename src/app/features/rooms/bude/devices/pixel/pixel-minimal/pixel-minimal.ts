import { Component } from '@angular/core';

/**
 * Minimalansicht des Pixel‑Geräts für RoomMenu und Raumanzeige.
 * Zeigt nur einen einfachen Platzhalter.
 */
@Component({
  selector: 'app-pixel-minimal',
  standalone: true,
  template: '<div class="device">Pixel 8 Pro</div>',
  // Host-Styles ermöglichen das Skalieren über ngStyle.
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class PixelMinimal {}
