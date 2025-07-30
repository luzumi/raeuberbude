import { Component, OnInit } from '@angular/core';
// Aktuellen HomeAssistantService einbinden
import { HomeAssistantService, Entity } from '../../../services/home-assistant/home-assistant.service';
import {MatCard, MatCardContent, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-lamp-toggle',
  standalone: true,
  templateUrl: './lamp-toggle.html',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle
  ],
  styleUrls: ['./lamp-toggle.scss']
})
export class LampToggleComponent implements OnInit {
  lampState: boolean = false;
  loading: boolean = false;
  readonly entityId = 'light.wiz_tunable_white_640190';

  constructor(private ha: HomeAssistantService) {}

  ngOnInit(): void {
    this.loadState();
  }

  loadState(): void {
    // Aktuellen Status der Lampe laden
    const ent = this.ha.getEntity(this.entityId);
    if (ent) {
      this.lampState = ent.state === 'on';
    }
  }

  toggleLamp(): void {
    this.loading = true;
    const service = this.lampState ? 'turn_off' : 'turn_on';
    // Service-Aufruf zum An/Aus-Schalten der Lampe
    this.ha.callService('light', service, this.entityId).subscribe({
      // Erfolgsfall: State umschalten und Ladeanzeige beenden
      next: () => {
        this.lampState = !this.lampState;
        this.loading = false;
      },
      // Fehlerfall: Laden ebenfalls beenden und optional Fehler loggen
      error: (err: unknown) => {
        console.error('Lamp toggle failed', err);
        this.loading = false;
      }
    });
  }
}
