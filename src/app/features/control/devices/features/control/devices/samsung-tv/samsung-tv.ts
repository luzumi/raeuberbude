import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {CommonModule, DecimalPipe} from '@angular/common';
import {Entity, HomeAssistant} from '../../../../../../../core/home-assistant';
import {MediaPlayerFeatureHelper} from '../../../../../../../core/MediaPlayerFeatureHelper';

@Component({
  selector: 'app-samsung-tv',
  templateUrl: './samsung-tv.html',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe
  ],
  styleUrls: ['./samsung-tv.scss'],
})
export class SamsungTv implements OnInit {
  samsung: Entity | undefined = undefined;
// samsung-tv.ts
  @Output() deviceClicked = new EventEmitter<void>();

  onDeviceClick() {
    this.deviceClicked.emit();
  }

  constructor(public hass: HomeAssistant) {}

  ngOnInit(): void {
    this.hass.entities$.subscribe((entities: Entity[]) => {
      this.samsung = entities.find((e: Entity) =>
        e.entity_id === 'media_player.tv_samsung'
      );
      console.log(entities)
      if (!this.samsung) {
        console.warn('[SamsungTv] Entity media_player.tv_samsung nicht gefunden');
        return;
      }

      console.log('[SamsungTv] Unterstützte Features:', this.samsung.attributes?.['supported_features']);
      console.log('[SamsungTv] Feature-Names:', MediaPlayerFeatureHelper.getSupportedFeatures(this.samsung));
    });
  }




  get isTvOn(): boolean {
    return this.samsung?.state !== 'on';
  }

  get isTvIdle(): boolean {
    return this.samsung?.state === 'idle';
  }

  togglePower(event: Event): void {
    if (!this.samsung) return;
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.hass.callService('input_boolean', 'toggle', {
      entity_id: 'input_boolean.tv_power'
    });

    this.toggleTvPower(event)
    if (this.samsung.state === 'off') {
      const service = MediaPlayerFeatureHelper.getServiceForFeature('TURN_ON');
      if(service) {

        this.hass.callService(service.domain, service.service, {
          entity_id: this.samsung.entity_id
        }).subscribe({
          next: res => console.log('[HA] TV eingeschaltet', res),
          error: err => console.error('[HA] Fehler beim Einschalten', err)
        });
      } else {
        console.warn('[HA] TURN_OFF nicht unterstützt. Alternativen nötig.');
      }
    }
  }


  setVolume(level: number, event: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    if (!this.samsung) return;
    this.hass.callService('media_player', 'volume_set', {
      entity_id: this.samsung.entity_id,
      volume_level: level / 100
    });
  }

  selectSource(source: string): void {
    if (!this.samsung) return;
    this.hass.callService('media_player', 'select_source', {
      entity_id: this.samsung.entity_id,
      source
    });
  }

  toggleTvPower(event: Event): void {
    event?.stopPropagation();
    this.hass.callService('script', 'tv_toggle', {}).subscribe({
      next: res => console.log('TV-Script ausgeführt', res),
      error: err => console.error('TV-Script Fehler', err)
    });
  }

}
