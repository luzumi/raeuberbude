import { Injectable } from '@angular/core';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';

/**
 * Service zur einheitlichen Steuerung des Samsung-TVs.
 * Bündelt Power- und Remote-Befehle, damit alle Komponenten
 * dieselben Aufrufe verwenden.
 */
@Injectable({ providedIn: 'root' })
export class SamsungTvService {
  constructor(private readonly hass: HomeAssistantService) {}

  /** Schaltet den Fernseher abhängig vom aktuellen Zustand um. */
  togglePower(currentState: string | undefined): void {
    const state = currentState ?? 'unavailable';
    console.log( state)
    if (state === 'on' || state === 'idle') {
      this.turnOff();
    } else {
      this.turnOn();
    }
  }

  /** Schaltet den Fernseher über die Remote-Entität ein. */
  turnOn(): void {
    this.hass.callService('remote', 'turn_on', { entity_id: 'remote.samsung' }).subscribe();
  }

  /** Schaltet den Fernseher über die Remote-Entität aus. */
  turnOff(): void {
    this.hass.callService('remote', 'turn_off', { entity_id: 'remote.samsung' }).subscribe();
  }

  /** Sendet einen beliebigen Samsung-Remote-Befehl. */
  sendCommand(cmd: string): void {
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: cmd,
    }).subscribe();
  }
}

