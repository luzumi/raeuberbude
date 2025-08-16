import { Component } from '@angular/core';

/**
 * Minimale Platzhalteransicht für den PC (Creator).
 */
@Component({
  selector: 'app-creator-minimal',
  standalone: true,
  template: '<div class="device">PC</div>',
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class CreatorMinimal {}
