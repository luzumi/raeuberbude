import { OnInit, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entity, HomeAssistantService } from '../../../../../../../services/home-assistant/home-assistant.service';
import { map } from 'rxjs';
import { HorizontalSlider } from '../../../../../../../shared/components/horizontal-slider/horizontal-slider';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FiretvComponent } from '../firetv/fire-tv-component';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, MatIconButton, MatIconModule, FiretvComponent],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements OnInit {
  samsung?: Entity;
  volume: number = 0;

  // Aktuell ausgewählte Befehle aus den Dropdowns
  selectedSamsungCommand = '';
  selectedFireTvCommand = '';

  // Befehlslisten für die Auswahlfelder
  samsungCommands: string[] = [
    'KEY_POWER', 'KEY_MUTE', 'KEY_VOLUMEUP', 'KEY_VOLUMEDOWN',
    'KEY_LEFT', 'KEY_RIGHT', 'KEY_UP', 'KEY_DOWN',
    'KEY_ENTER', 'KEY_HOME', 'KEY_PLAY', 'KEY_PAUSE', 'KEY_SOURCE'
  ];

  fireTvCommands: string[] = [
    'HOME', 'BACK', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SELECT', 'PLAY', 'PAUSE'
  ];

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
  /**
   * Sendet einen frei gewählten Samsung-IR-Befehl aus dem Dropdown.
   */
  sendSamsungCommand(): void {
    if (!this.selectedSamsungCommand) { return; }
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: this.selectedSamsungCommand,
    }).subscribe({
      next: () => console.log(`[SamsungTv] Befehl ${this.selectedSamsungCommand} gesendet`),
      error: err => console.error('[SamsungTv] Fehler beim Samsung-Befehl:', err)
    });
  }

  /**
   * Sendet einen frei gewählten FireTV-Befehl aus dem Dropdown.
   */
  sendFireTvCommand(): void {
    if (!this.selectedFireTvCommand) { return; }
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.firetv',
      command: this.selectedFireTvCommand,
    }).subscribe({
      next: () => console.log(`[SamsungTv] FireTV-Befehl ${this.selectedFireTvCommand} gesendet`),
      error: err => console.error('[SamsungTv] Fehler beim FireTV-Befehl:', err)
    });
  }
}
