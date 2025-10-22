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

  /** Versucht die Samsung-Remote-ID aus dem aktuellen State-Snapshot aufzulösen. */
  private resolveSamsungRemoteId(): string | undefined {
    const states = this.hass.getEntitiesSnapshot();
    const exact = states.find(e => e.entity_id === 'remote.samsung');
    if (exact) return exact.entity_id;
    const byId = states.find(e => e.entity_id.startsWith('remote.') && e.entity_id.toLowerCase().includes('samsung'));
    if (byId) return byId.entity_id;
    const byName = states.find(e => e.entity_id.startsWith('remote.') && (e.attributes?.friendly_name || '').toLowerCase().includes('samsung'));
    return byName?.entity_id;
  }

  /** Schaltet den Fernseher abhängig vom aktuellen Zustand um. */
  togglePower(currentState = 'unavailable'): void {
    const s = currentState;
    console.log( s)
    if (s === 'on' || s === 'idle') {
      this.turnOff();
    } else {
      this.turnOn();
    }
  }

  /** Schaltet den Fernseher über die Remote-Entität ein. */
  turnOn(): void {
    const remoteId = this.resolveSamsungRemoteId() || 'remote.samsung';
    this.hass.callService('remote', 'turn_on', { entity_id: remoteId }).subscribe();
  }

  /** Schaltet den Fernseher über die Remote-Entität aus. */
  turnOff(): void {
    const remoteId = this.resolveSamsungRemoteId() || 'remote.samsung';
    this.hass.callService('remote', 'turn_off', { entity_id: remoteId }).subscribe();
  }

  /** Sendet einen beliebigen Samsung-Remote-Befehl. */
  sendCommand(cmd: string): void {
    const remoteId = this.resolveSamsungRemoteId() || 'remote.samsung';
    this.hass.callService('remote', 'send_command', {
      entity_id: remoteId,
      command: cmd,
    }).subscribe();
  }
}

