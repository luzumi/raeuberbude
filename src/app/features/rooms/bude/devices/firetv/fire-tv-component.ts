import {Component, EventEmitter, Output, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { FireTvController, FireTvEntity, RemoteEntity } from '@services/home-assistant/fire-tv-control';
import { FormsModule } from '@angular/forms';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';

@Component({
  selector: 'app-firetv',
  templateUrl: './fire-tv-component.html',
  styleUrl: './fire-tv-component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HorizontalSlider],
})
export class FiretvComponent {
  firetv?: FireTvController;
  volume = signal(0);
  @Output() onDeviceClick = new EventEmitter<Event>();

  constructor(private hass: HomeAssistantService) {
    // Ermittelt Player und Remote dynamisch anhand der Entity-ID.
    this.hass.entities$.subscribe(entities => {
      const player = entities.find(e => e.entity_id.startsWith('media_player.') && e.entity_id.includes('fire_tv')) as FireTvEntity | undefined;
      const remote = entities.find(e => e.entity_id.startsWith('remote.') && e.entity_id.includes('fire_tv')) as RemoteEntity | undefined;

      if (player && remote) {
        this.firetv = new FireTvController(player, remote, (d, s, p) => this.hass.callService(d, s, p));

        const lvl = player.attributes['volume_level'] ?? 0;
        this.volume.set(Math.round(lvl * 100));
      }
    });
  }

  togglePower(): void {
    if (!this.firetv) return;
    this.firetv.isOn ? this.firetv.turnOff() : this.firetv.turnOn();
  }

  setVolume(val: number): void {
    const volumeLevel = val / 100;
    if (!this.firetv) return;
    this.hass.callService('media_player', 'volume_set', {
      entity_id: this.firetv.entityId,
      volume_level: volumeLevel
    });
    this.volume.set(val);
  }


  get name(): string {
    return this.firetv?.name ?? 'Fire TV';
  }

  get state(): string {
    return this.firetv?.state ?? '-';
  }

  get app(): string {
    return this.firetv?.app ?? '-';
  }

  onDeviceClicked(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.onDeviceClick.emit(event);
  }
}
