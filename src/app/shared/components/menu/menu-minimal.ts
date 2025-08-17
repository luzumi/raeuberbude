import { Component } from '@angular/core';

/**
 * Minimalansicht des Menü-Buttons für die Geräteübersicht.
 * Zeigt lediglich einen beschrifteten Platzhalter.
 */
@Component({
  selector: 'app-menu-minimal',
  standalone: true,
  template: '<div class="device">Menü</div>',
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class MenuMinimal {}
