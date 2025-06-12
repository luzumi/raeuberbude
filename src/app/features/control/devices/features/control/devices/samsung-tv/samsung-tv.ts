import {AfterViewInit, Component, EventEmitter, OnInit, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entity, HomeAssistantService } from '../../../../../../../services/home-assistant/home-assistant.service';
import {map} from 'rxjs';
import {HorizontalSlider} from '../../../../../../../shared/components/horizontal-slider/horizontal-slider';
import {FormsModule} from '@angular/forms';
import {FiretvComponent} from '../firetv/fire-tv-component';
import {MatIconButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, FiretvComponent, MatIconButton, MatIconModule,],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements AfterViewInit {
  samsung?: Entity;
  volume: number = 0;


  @Output() deviceClicked = new EventEmitter<void>();
  onDeviceClick($event: Event): void {
    this.deviceClicked.emit();
  }

  constructor(public hass: HomeAssistantService) {}

  ngAfterViewInit(): void {
    this.hass.entities$
      .pipe(
        map((entities) => {
          return entities.find(e => e.entity_id === 'media_player.tv_samsung');
        })
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


  get name(): string {
    return this.samsung?.attributes.friendly_name ?? 'Unbekannt';
  }

  get state(): string {
    return this.samsung?.state ?? '-';
  }

  get isMuted(): string {
    return this.samsung?.attributes['is_volume_muted'] ? 'ja' : 'nein';
  }

  setVolume(value: any): void {
    this.volume = value;
    const volumeLevel = value / 100;
    const entityId = 'media_player.tv_samsung';

    this.hass.callService('media_player', 'volume_set', {
      entity_id: entityId,
      volume_level: volumeLevel
    }).subscribe({
      error: (err) => console.error('[SamsungTv] Fehler beim Setzen der Lautstärke', err)
    });
  }

  togglePower(): void {
    const remoteId = 'remote.samsung';
    const service = this.samsung?.state === 'off' ? 'turn_on' : 'turn_off';

    this.hass.callService('remote', service, {
      entity_id: remoteId
    }).subscribe({
      next: res => console.log(`[SamsungTv] ${service} erfolgreich`, res),
      error: err => console.error(`[SamsungTv] Fehler bei ${service}`, err)
    });
  }

}
