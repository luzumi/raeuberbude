import {OnInit, Component, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import { Entity, HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { SamsungTvService } from '@services/samsung-tv.service';
import { map } from 'rxjs';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FiretvComponent } from '../../firetv/fire-tv-component';
import { KeyPadComponent } from '@shared/components/key-pad-component/key-pad.component';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, MatIconButton, MatIconModule, FiretvComponent, KeyPadComponent],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements OnInit {
  samsung?: Entity;
  volume: number = 0;

  // Command lists fetched dynamically from Home Assistant via WebSocket
  fireTvCommands: string[] = [];
  samsungCommands: string[] = [];
  selectedFireCommand?: string;
  selectedSamsungCommand?: string;

  @Output() deviceClicked = new EventEmitter<void>();
  /** Ermöglicht das Zurücknavigieren zur Geräteübersicht. */
  @Output() back = new EventEmitter<void>();

  constructor(
    public hass: HomeAssistantService,
    // Gemeinsamer Service, der alle Samsung-Befehle kapselt
    private readonly tv: SamsungTvService
  ) {}

  /**
   * Subscribe during OnInit to avoid ExpressionChangedAfterItHasBeenCheckedError
   * caused by updating template-bound values after the view was initialized.
   */
  ngOnInit(): void {
    this.hass.entities$
      .pipe(
        map((entities) => entities.find(e => e.entity_id === 'media_player.tv_samsung'))
      )
      .subscribe((entity) => {
        if (entity) {
          this.samsung = entity;
          this.volume = Math.round((entity.attributes.volume_level ?? 0) * 100);
        } else {
          console.warn('[SamsungTv] Entity media_player.tv_samsung nicht gefunden' + entity);
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
      next: (states) => {
        const fire = states.find(e => e.entity_id === 'remote.fire_tv');
        console.log('FireTV: ', fire)
        this.fireTvCommands = fire?.attributes?.['command_list'] ?? [];

        const samsung = states.find(e => e.entity_id === 'remote.samsung');
        this.samsungCommands = samsung?.attributes?.['command_list'] ?? [];
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

    this.hass.callService('media_player', 'volume_set', {
      entity_id: 'media_player.tv_samsung',
      volume_level: volumeLevel
    }).subscribe({
      next: () => console.log('[SamsungTv] Lautstärke gesetzt:', volumeLevel),
      error: (err) => console.error('[SamsungTv] Fehler beim Setzen der Lautstärke:', err)
    });
  }

  togglePower(): void {
    // Einheitliche Power-Steuerung über den Service
    this.tv.togglePower(this.samsung?.state);
  }

  /**
   * Wählt direkt eine Quelle aus dem Source-Menü.
   * Wird im Test verwendet, daher hier minimal implementiert.
   */
  selectSource(source: string): void {
    this.hass.callService('media_player', 'select_source', {
      entity_id: 'media_player.tv_samsung',
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
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.fire_tv',
      command: cmd
    }).subscribe();
  }

  /**
   * Sends the chosen Samsung TV command via WebSocket.
   */
  // Sends any Samsung TV command chosen from buttons or select
  sendSamsungCommand(cmd: string): void {
    if (!cmd) return;
    // Zentrale Ausführung aller Samsung-Kommandos
    this.tv.sendCommand(cmd);
  }

}
