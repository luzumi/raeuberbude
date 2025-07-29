import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, map } from 'rxjs';
import { AppButtonComponent } from '../../../../../../../shared/components/app-button/app-button';
import { HomeAssistantService, Entity } from '../../../../../../../services/home-assistant/home-assistant.service';

@Component({
  selector: 'app-orange-light',
  imports: [CommonModule, AppButtonComponent],
  standalone: true,
  templateUrl: './orange-light.html',
  styleUrl: './orange-light.scss'
})
export class OrangeLight implements OnDestroy {
  /** Aktueller Zustand der Lampe */
  isOn = false;
  /** ID der Home Assistant Entity */
  readonly entityId = 'light.wiz_tunable_white_640190';

  private sub: Subscription;

  constructor(private ha: HomeAssistantService) {
    // Bei jedem State-Update den Lampenzustand aktualisieren
    this.sub = this.ha.entities$
      .pipe(map(es => es.find(e => e.entity_id === this.entityId)))
      .subscribe(e => this.isOn = e?.state === 'on');
  }

  /** Lampenzustand umschalten */
  toggle(): void {
    const service = this.isOn ? 'turn_off' : 'turn_on';
    // Service-Aufruf über WebSocket an Home Assistant schicken
    this.ha.callService('light', service, { entity_id: this.entityId }).subscribe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
