import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Minimale Darstellung des Orange‑Light‑Geräts mit dekorativem Lampenbild.
 * Zeigt visuell den Zustand: An (normal), Aus (gedimmt), Nicht verfügbar (Graustufen)
 */
@Component({
  selector: 'app-orange-light-minimal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lamp-container">
      <img 
        src="assets/icons/orange-light-lamp.svg" 
        alt="Orange Light" 
        class="lamp-icon"
        [class.on]="isOn"
        [class.off]="!isOn && isAvailable"
        [class.unavailable]="!isAvailable"
      />
      <span class="lamp-label">Orange Light</span>
    </div>
  `,
  styleUrls: ['./orange-light-minimal.scss'],
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class OrangeLightMinimal implements OnDestroy {
  /** Aktueller Zustand der Lampe */
  isOn = false;
  
  /** Ob die Lampe verfügbar ist (Home Assistant erreichbar) */
  isAvailable = true;
  
  /** Entity-ID der Lampe in Home Assistant */
  readonly entityId = 'light.wiz_tunable_white_640190';
  
  private sub?: Subscription;

  constructor(private ha: HomeAssistantService) {
    // Subscribe auf Entity-State-Updates
    this.sub = this.ha.entities$
      .pipe(
        map(entities => entities.find(e => e.entity_id === this.entityId))
      )
      .subscribe(entity => {
        if (entity) {
          this.isOn = entity.state === 'on';
          this.isAvailable = entity.state !== 'unavailable';
        } else {
          this.isOn = false;
          this.isAvailable = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
