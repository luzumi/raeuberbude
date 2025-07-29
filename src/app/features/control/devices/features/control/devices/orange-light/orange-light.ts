/**
 * OrangeLight Component
 *
 * Stellt einen Device-Button zum Ein- und Ausschalten der Lampe bereit.
 * Die Kommunikation erfolgt über den HomeAssistantService per WebSocket.
 */
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, map } from 'rxjs';
import { AppButtonComponent } from '../../../../../../../shared/components/app-button/app-button';
import { HomeAssistantService } from '../../../../../../../services/home-assistant/home-assistant.service';

@Component({
  selector: 'app-orange-light',
  imports: [CommonModule, AppButtonComponent],
  standalone: true,
  templateUrl: './orange-light.html',
  styleUrl: './orange-light.scss'
})
export class OrangeLight implements OnDestroy {
  /**
   * Speichert, ob die Lampe laut Home Assistant aktuell eingeschaltet ist.
   * Dieser Wert steuert auch die Farbe des Buttons.
   */
  isOn = false;
  /**
   * Entity-ID der Lampe in Home Assistant. 
   * Muss zum jeweiligen Setup passen.
   */
  readonly entityId = 'light.wiz_tunable_white_640190';

  /** Subscription auf State-Änderungen */
  private sub: Subscription;

  constructor(private ha: HomeAssistantService) {
    // Bei jedem State-Update den Lampenzustand aktualisieren
    this.sub = this.ha.entities$
      .pipe(map(es => es.find(e => e.entity_id === this.entityId)))
      .subscribe(e => this.isOn = e?.state === 'on');
  }

  /**
   * Lampenzustand umschalten.
   * Sendet 'turn_on' oder 'turn_off' über den HomeAssistantService.
   */
  toggle(): void {
    const service = this.isOn ? 'turn_off' : 'turn_on';
    // Service-Aufruf über WebSocket an Home Assistant schicken
    this.ha.callService('light', service, { entity_id: this.entityId }).subscribe();
  }

  /** Aufräumen der Subscription, wenn die Komponente zerstört wird */
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
