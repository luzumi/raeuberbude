import {OnInit, Component, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Entity, HomeAssistantService} from '../../../../../../../services/home-assistant/home-assistant.service';
import {map} from 'rxjs';
import {HorizontalSlider} from '../../../../../../../shared/components/horizontal-slider/horizontal-slider';
import {FormsModule} from '@angular/forms';
import {MatIconButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, MatIconButton, MatIconModule],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements OnInit {
  samsung?: Entity;
  volume: number = 0;

  // Kommandolisten für Dropdowns – orientiert an Home-Assistant-Remote-Codes
  samsungCommands: string[] = [
    'KEY_HOME', 'KEY_MENU', 'KEY_SOURCE', 'KEY_LEFT', 'KEY_RIGHT',
    'KEY_UP', 'KEY_DOWN', 'KEY_ENTER', 'KEY_BACK', 'KEY_MUTE',
    'KEY_PLAY', 'KEY_PAUSE'
  ];
  fireTvCommands: string[] = [
    'Home', 'Back', 'Up', 'Down', 'Left', 'Right',
    'Select', 'Play', 'Pause'
  ];

  // Gebundene Werte der Selects
  selectedSamsungCommand?: string;
  selectedFireTvCommand?: string;

  @Output() deviceClicked = new EventEmitter<void>();

  constructor(public hass: HomeAssistantService) {
  }

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
          console.warn('[SamsungTv] Entity media_player.tv_samsung nicht gefunden');
        }
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
    const samsungState = this.samsung?.state ?? 'unavailable';
    console.log(this.samsung?.state);
    if (samsungState === 'on' || samsungState === 'idle') {
      this.turnOffTV();
      return;
    }
    this.turnOnTV();
  }


  private turnOnTV() {
    this.hass.callService('remote', 'turn_on', {
      entity_id: 'remote.samsung'
    }).subscribe({
      next: () => console.log('[SamsungTv] Einschaltversuch über remote.samsung'),
      error: (err) => {
        console.warn('[SamsungTv] remote.samsung fehlgeschlagen, versuche FireTV als Fallback:', err);

        // Fallback: FireTV einschalten
        this.hass.callService('remote', 'turn_on', {
          entity_id: 'remote.firetv'
        }).subscribe({
          next: () => console.log('[SamsungTv] FireTV als Fallback aktiviert'),
          error: (err) => console.error('[SamsungTv] FireTV-Fallback fehlgeschlagen:', err)
        });
      }
    });
  }

  private turnOffTV() {
    this.hass.callService('remote', 'turn_off', {
      entity_id: 'remote.samsung'
    }).subscribe({
      next: () => {
        console.log('[SamsungTv] TV ausgeschaltet');

        // Jetzt auch FireTV ausschalten
        this.hass.callService('remote', 'turn_off', {
          entity_id: 'remote.firetv'
        }).subscribe({
          next: () => console.log('[SamsungTv] FireTV ausgeschaltet'),
          error: (err) => console.error('[SamsungTv] Fehler beim FireTV-Ausschalten:', err)
        });
      },
      error: (err) => console.error('[SamsungTv] Fehler beim Ausschalten des TVs:', err)
    });
  }

  toggleMute(): void {
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: 'KEY_MUTE'
    }).subscribe({
      next: () => console.log('[SamsungTv] IR Mute Command gesendet'),
      error: (err) => console.error('[SamsungTv] Fehler beim IR-Mute:', err)
    });
  }

  nextSource() {
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: 'KEY_SOURCE'
    });

  }

  // Sendet ein beliebiges Kommando an den Samsung-TV über WebSocket
  sendSamsungCommand(command: string | undefined): void {
    if (!command) { return; }
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command
    }).subscribe();
  }

  // Sendet ein Kommando an den FireTV-Adapter
  sendFireTvCommand(command: string | undefined): void {
    if (!command) { return; }
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.firetv',
      command
    }).subscribe();
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

  screenLeft(){
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: [ 'KEY_LEFT']
    });
  }
  screenRight(){
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: [ 'KEY_RIGHT']
    });
  }
}
