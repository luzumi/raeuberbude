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
  selectedSource?: string;
  /** Timer zur Aktualisierung der Statusdauer. */
  private sinceSub?: Subscription;

  constructor(private readonly hass: HomeAssistantService) {}

  ngOnInit(): void {
    // Beobachtet Änderungen der TV-Entität und aktualisiert Statuswerte.
    this.hass.entities$
    .pipe(map(entities => entities.find(e => e.entity_id === 'media_player.tv_samsung')))
    .subscribe(entity => {
      if (!entity) {
        console.warn('[SamsungTvMinimal] Entity media_player.tv_samsung nicht gefunden');
        return;
      }
      this.samsung = entity;
      this.volume = Math.round((entity.attributes.volume_level ?? 0) * 100);
      this.sources = entity.attributes['source_list'] ?? [];
      this.selectedSource = entity.attributes['source'];
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
      this.hass.callService('remote', 'turn_off', { entity_id: 'remote.samsung' }).subscribe();
    } else {
      this.hass.callService('remote', 'turn_on', { entity_id: 'remote.samsung' }).subscribe();
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
    this.hass.callService('media_player', 'select_source', {
      entity_id: 'media_player.tv_samsung',
      source
    }).subscribe();
  }

  /** Hilfsmethode zum Senden eines beliebigen Samsung-Kommandos. */
  private sendSamsungCommand(cmd: string): void {
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: cmd
    }).subscribe();
  }

  /** Liefert den aktuellen Status des TVs. */
  get state(): string {
    return this.samsung?.state ?? '-';
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

