import { Component, OnDestroy, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { HomeAssistantService, Entity } from '@services/home-assistant/home-assistant.service';

import { AppButtonComponent } from '@shared/components/app-button/app-button';
import { interval, map, Subscription } from 'rxjs';


/**
 * Minimalansicht der Samsung-TV-Steuerung für das RoomMenu.
 * Bietet nur grundlegende Bedienelemente wie Power, Lautstärke und Kanal.
 */
@Component({
  selector: 'app-samsung-tv-minimal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatIconButton, AppButtonComponent],
  templateUrl: './samsung-tv-minimal.html',
  styleUrls: ['./samsung-tv-minimal.scss']
})

export class SamsungTvMinimal implements OnInit, OnDestroy {
  /** Aktuelle Samsung-TV Entität. */
  samsung?: Entity;
  /** Prozentuale Lautstärke (0-100). */
  volume = 0;
  /** Liste verfügbarer Quellen des TVs. */
  sources: string[] = [];
  /** Gewählte Quelle im Dropdown. */
  selectedSource: string = '';
  /** Timer zur Aktualisierung der Statusdauer. */
  private sinceSub?: Subscription;
  /** Zur Laufzeit ermittelte Entity-ID des Media-Players. */
  private samsungPlayerId?: string;
  /** Entity-ID der zugehörigen Remote (z.B. "remote.samsung"). */
  private samsungRemoteId?: string;

  constructor(private readonly hass: HomeAssistantService) {}

  ngOnInit(): void {
    // Suche den ersten Media-Player und die zugehörige Remote mit "samsung" im Namen.
    this.hass.entities$
      .pipe(
        map(entities => ({
          player: entities.find(e => e.entity_id.startsWith('media_player.') && e.entity_id.includes('samsung')),
          remote: entities.find(e => e.entity_id.startsWith('remote.') && e.entity_id.includes('samsung'))
        }))
      )
      .subscribe(({ player, remote }) => {
        if (!player || !remote) {
          console.warn('[SamsungTvMinimal] Samsung‑Entität nicht gefunden', player, remote);
          return;
        }
        // IDs für spätere Service-Calls zwischenspeichern
        this.samsung = player;
        this.samsungPlayerId = player.entity_id;
        this.samsungRemoteId = remote.entity_id;
        this.volume = Math.round((player.attributes.volume_level ?? 0) * 100);
        this.sources = player.attributes['source_list'] ?? [];
        this.selectedSource = <string>player.attributes['source'];
      });

    // Triggert regelmäßige Change Detection, damit "an/aus seit" aktuell bleibt.
    this.sinceSub = interval(60_000).subscribe();
  }

  ngOnDestroy(): void {
    this.sinceSub?.unsubscribe();
  }

  /** Schaltet den Fernseher an oder aus. */
  togglePower(): void {
    const state = this.samsung?.state ?? 'unavailable';
    if (state === 'on' || state === 'idle') {
      // entity_id wird dynamisch ermittelt, daher nur ausführen wenn bekannt
      if (this.samsungRemoteId) {
        this.hass.callService('remote', 'turn_off', { entity_id: this.samsungRemoteId }).subscribe();
      }
    } else {
      if (this.samsungRemoteId) {
        this.hass.callService('remote', 'turn_on', { entity_id: this.samsungRemoteId }).subscribe();
      }
    }
  }

  /** Erhöht die Lautstärke per Remote-Kommando. */
  volumeUp(): void {
    this.sendSamsungCommand('KEY_VOLUP');
  }

  /** Verringert die Lautstärke per Remote-Kommando. */
  volumeDown(): void {
    this.sendSamsungCommand('KEY_VOLDOWN');
  }

  /** Schaltet zum nächsten Sender. */
  channelUp(): void {
    this.sendSamsungCommand('KEY_CHUP');
  }

  /** Schaltet zum vorherigen Sender. */
  channelDown(): void {
    this.sendSamsungCommand('KEY_CHDOWN');
  }

  /** Wechselt die Quelle des Fernsehers. */
  changeSource(source: string): void {
    if (!this.samsungPlayerId) return; // Keine Entität gefunden
    this.hass.callService('media_player', 'select_source', {
      entity_id: this.samsungPlayerId,
      source
    }).subscribe();
  }

  /** Hilfsmethode zum Senden eines beliebigen Samsung-Kommandos. */
  private sendSamsungCommand(cmd: string): void {
    if (!this.samsungRemoteId) return;
    this.hass.callService('remote', 'send_command', {
      entity_id: this.samsungRemoteId,
      command: cmd
    }).subscribe();
  }

  /** Liefert den aktuellen Status des TVs. */
  get state(): string {
    return this.samsung?.state === 'unavailable' ? '': this.samsung?.state ?? '-';
  }

  /**
   * True, wenn der Fernseher eingeschaltet oder im Idle ist.
   * Dient zur farblichen Kennzeichnung des Power-Icons.
   */
  get isOn(): boolean {
    return this.state === 'on' || this.state === 'idle';
  }

  /** Liefert die aktuell gewählte Quelle. */
  get currentSource(): string {
    return this.samsung?.attributes['source'] ?? '-';
  }

  /**
   * Gibt den Zeitraum seit der letzten Statusänderung zurück, z.B. "an seit 5m".
   */
  get statusSince(): string {
    const last = this.samsung?.last_changed;
    if (!last) {
      return '';
    }
    const diffMs = Date.now() - new Date(last).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    let duration: string;
    if (diffDay > 0) {
      duration = `${diffDay}d`;
    } else if (diffHour > 0) {
      duration = `${diffHour}h`;
    } else if (diffMin > 0) {
      duration = `${diffMin}m`;
    } else {
      duration = `${diffSec}s`;
    }
    return `${this.isOn ? 'an' : 'aus'} seit ${duration}`;
  }

  /** Anzeigename aus den Entity-Attributen. */
  get name(): string {
    return this.samsung?.attributes.friendly_name ?? 'Unbekannt';
  }
}

