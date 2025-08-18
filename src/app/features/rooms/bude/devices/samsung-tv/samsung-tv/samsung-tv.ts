import {OnInit, Component, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import { Entity, HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { map } from 'rxjs';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FiretvComponent } from '../../firetv/fire-tv-component';
import { KeyPadComponent } from '@shared/components/key-pad-component/key-pad.component';
import { FireTvController, FireTvEntity, RemoteEntity } from '@services/home-assistant/fire-tv-control';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, MatIconButton, MatIconModule, FiretvComponent, KeyPadComponent],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements OnInit {
  /** Gefundene Samsung Media-Player‑Entität. */
  samsung?: Entity;
  /** Aktuelle Lautstärke als Prozentwert. */
  volume: number = 0;

  /** Merkt sich die dynamisch ermittelte Entity-ID des Samsung Media‑Players. */
  private samsungPlayerId?: string;
  /** Merkt sich die Entity-ID der Samsung‑Remote, falls vorhanden. */
  private samsungRemoteId?: string;

  /** Entity-IDs des FireTV zur Weiterverwendung (Fallback). */
  private firePlayerId?: string;
  private fireRemoteId?: string;

  /**
   * Wrapper für das Fire‑TV; stellt die verfügbaren Befehle bereit
   * und versendet Kommandos über den Home‑Assistant‑Service.
   */
  fireTv?: FireTvController;

  // Command lists fetched dynamically from Home Assistant via WebSocket
  fireTvCommands: string[] = [];
  samsungCommands: string[] = [];
  selectedFireCommand?: string;
  selectedSamsungCommand?: string;

  @Output() deviceClicked = new EventEmitter<void>();
  /** Ermöglicht das Zurücknavigieren zur Geräteübersicht. */
  @Output() back = new EventEmitter<void>();

  constructor(public hass: HomeAssistantService) {
  }

  /**
   * Subscribe during OnInit to avoid ExpressionChangedAfterItHasBeenCheckedError
   * caused by updating template-bound values after the view was initialized.
   */
  ngOnInit(): void {
    // Suche zur Laufzeit nach einer Media-Player‑Entität mit "samsung" im Namen.
    this.hass.entities$
      .pipe(
        map(entities => entities.find(e => e.entity_id.startsWith('media_player.') && e.entity_id.includes('samsung')))
      )
      .subscribe(entity => {
        if (entity) {
          this.samsung = entity;
          this.samsungPlayerId = entity.entity_id; // spätere Service‑Calls
          this.volume = Math.round((entity.attributes.volume_level ?? 0) * 100);
        } else {
          console.warn('[SamsungTv] Keine Media-Player-Entität mit "samsung" gefunden');
        }
      });

    // Load available command lists for FireTV and Samsung remote
    this.loadCommands();
  }

  /**
   * Requests the command lists for the remotes from Home Assistant via WebSocket.
   */
  private loadCommands(): void {
    this.hass.getStatesWs().subscribe({
      next: states => {
        // FireTV anhand seines Namens bestimmen (media_player + remote)
        const firePlayer = states.find(e => e.entity_id.startsWith('media_player.') && e.entity_id.includes('fire_tv')) as FireTvEntity | undefined;
        const fireRemote = states.find(e => e.entity_id.startsWith('remote.') && e.entity_id.includes('fire_tv')) as RemoteEntity | undefined;
        if (firePlayer && fireRemote) {
          this.fireTv = new FireTvController(firePlayer, fireRemote,
            (d, s, p) => this.hass.callService(d, s, p));
          this.fireTvCommands = this.fireTv.availableCommands;
          this.firePlayerId = firePlayer.entity_id;
          this.fireRemoteId = fireRemote.entity_id;
        }

        // Samsung‑Remote inklusive Befehlsliste suchen
        const samsungRemote = states.find(e => e.entity_id.startsWith('remote.') && e.entity_id.includes('samsung'));
        this.samsungRemoteId = samsungRemote?.entity_id;
        this.samsungCommands = samsungRemote?.attributes?.['command_list'] ?? [];
      },
      error: err => console.error('[SamsungTv] Fehler beim Laden der Befehle:', err)
    });
  }

  onDeviceClick(): void {
    this.deviceClicked.emit();
  }

  get name(): string {
    return this.samsung?.attributes.friendly_name ?? 'Unbekannt';
  }

  get state(): string {
    return this.samsung?.state ?? '-';
  }

  get isMuted(): string {
    return this.samsung?.attributes['is_volume_muted'] ? 'ja' : 'nein';
  }

  setVolume(value: number): void {
    this.volume = value;
    const volumeLevel = value / 100;

    if (!this.samsungPlayerId) {
      console.warn('[SamsungTv] Keine Samsung-Player-ID bekannt, Lautstärke kann nicht gesetzt werden');
      return;
    }

    this.hass.callService('media_player', 'volume_set', {
      entity_id: this.samsungPlayerId,
      volume_level: volumeLevel
    }).subscribe({
      next: () => console.log('[SamsungTv] Lautstärke gesetzt:', volumeLevel),
      error: err => console.error('[SamsungTv] Fehler beim Setzen der Lautstärke:', err)
    });
  }

  togglePower(): void {
    const samsungState = this.samsung?.state ?? 'unavailable';
    console.log(this.samsung?.state);
    if (samsungState === 'on' || samsungState === 'idle') {
      this.turnOffTV();
      return;
    }
    this.turnOnTV();
  }


  private turnOnTV() {
    if (!this.samsungRemoteId) {
      console.warn('[SamsungTv] Keine Samsung-Remote gefunden');
      return;
    }
    this.hass.callService('remote', 'turn_on', {
      entity_id: this.samsungRemoteId
    }).subscribe({
      next: () => console.log(`[SamsungTv] Einschaltversuch über ${this.samsungRemoteId}`),
      error: err => {
        console.warn(`[SamsungTv] Einschalten über ${this.samsungRemoteId} fehlgeschlagen, versuche FireTV als Fallback:`, err);

        // Fallback: FireTV einschalten
        this.hass.callService('remote', 'turn_on', {
          entity_id: this.fireRemoteId
        }).subscribe({
          next: () => console.log('[SamsungTv] FireTV als Fallback aktiviert'),
          error: err => console.error('[SamsungTv] FireTV-Fallback fehlgeschlagen:', err)
        });
      }
    });
  }

  private turnOffTV() {
    if (!this.samsungRemoteId) {
      console.warn('[SamsungTv] Keine Samsung-Remote gefunden');
      return;
    }
    this.hass.callService('remote', 'turn_off', {
      entity_id: this.samsungRemoteId
    }).subscribe({
      next: () => {
        console.log('[SamsungTv] TV ausgeschaltet');

        // Jetzt auch FireTV ausschalten
        this.hass.callService('remote', 'turn_off', {
          entity_id: this.fireRemoteId
        }).subscribe({
          next: () => console.log('[SamsungTv] FireTV ausgeschaltet'),
          error: err => console.error('[SamsungTv] Fehler beim FireTV-Ausschalten:', err)
        });
      },
      error: err => console.error('[SamsungTv] Fehler beim Ausschalten des TVs:', err)
    });
  }

  /**
   * Wählt direkt eine Quelle aus dem Source-Menü.
   * Wird im Test verwendet, daher hier minimal implementiert.
   */
  selectSource(source: string): void {
    if (!this.samsungPlayerId) return;
    this.hass.callService('media_player', 'select_source', {
      entity_id: this.samsungPlayerId,
      source
    }).subscribe();
  }

  /**
   * Sends the chosen FireTV command via WebSocket.
   * Added as an alternative to the existing buttons.
   */
  // Forward selected FireTV command to Home Assistant
  sendFireTvCommand(cmd: string): void {
    if (!cmd) return;
    // Nutzung des FireTV‑Controllers erlaubt auch dynamische Kommandos
    this.fireTv?.sendCommand(cmd);
  }

  /**
   * Sends the chosen Samsung TV command via WebSocket.
   */
  // Sends any Samsung TV command chosen from buttons or select
  sendSamsungCommand(cmd: string): void {
    if (!cmd) return;
    if (!this.samsungRemoteId) return;
    this.hass.callService('remote', 'send_command', {
      entity_id: this.samsungRemoteId,
      command: cmd
    }).subscribe({
      next: () => console.log(`[SamsungTv] Kommando '${cmd}' an ${this.samsungRemoteId} gesendet`),
      error: err => console.error('[SamsungTv] Fehler beim Senden des Samsung-Kommandos:', err)
    });
  }

}
