import {AfterViewInit, Component, EventEmitter, OnInit, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entity, HomeAssistant } from '../../../../../../../core/home-assistant';
import {map} from 'rxjs';
import {HorizontalSlider} from '../../../../../../../shared/components/horizontal-slider/horizontal-slider';
import {FormsModule} from '@angular/forms';
import {Firetv} from '../firetv/firetv';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [CommonModule, HorizontalSlider, FormsModule, Firetv],
  styleUrls: ['./samsung-tv.scss']
})
export class SamsungTv implements AfterViewInit {
  samsung?: Entity;
  volume: number = 0;


  @Output() deviceClicked = new EventEmitter<void>();
  onDeviceClick(): void {
    this.deviceClicked.emit();
  }

  constructor(public hass: HomeAssistant) {}

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

}
