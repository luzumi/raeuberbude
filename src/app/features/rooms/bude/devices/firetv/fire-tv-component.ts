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

  constructor(private readonly hass: HomeAssistantService) {
    this.hass.entities$.subscribe(entities => {
      const player = entities.find(e => e.entity_id === 'media_player.fire_tv') as FireTvEntity;
      const remote = entities.find(e => e.entity_id === 'remote.fire_tv') as RemoteEntity;
//{"type":"call_service","domain":"remote","service":"send_command","service_data":{"entity_id":"remote.samsung","command":"KEY_SOURCE"},"id":3}
      if (player && remote) {
        this.firetv = new FireTvController(player, remote, (d, s, p) => this.hass.callService(d, s, p)        );
        console.log('FireTV: ', player, 'Remote: ', remote, '')
        //{entity_id: 'media_player.fire_tv', state: 'idle', attributes: {…}, last_changed: '2025-08-18T15:36:33.032295+00:00', last_reported: '2025-08-18T15:36:37.667087+00:00', …}attributes: adb_response: nullapp_id: "com.amazon.tv.launcher"device_class: "tv"entity_picture: "/api/media_player_proxy/media_player.fire_tv?token=8777f0c5f2a0f6d7b03f4d3a5206c96eb6a8b4590801f3b3a69d54dc15412ce0&cache=c8e4c187a3abbf53"friendly_name: "Fire_TV"hdmi_input: nullsource: "com.amazon.tv.launcher"source_list: Array(1)0: "com.amazon.tv.launcher"length: 1[[Prototype]]: Array(0)supported_features: 22961[[Prototype]]: Objectcontext: {id: '01K2YX6JH371SK48FTD8XZ4SMF', parent_id: null, user_id: null}entity_id: "media_player.fire_tv"last_changed: "2025-08-18T15:36:33.032295+00:00"last_reported: "2025-08-18T15:36:37.667087+00:00"last_updated: "2025-08-18T15:36:37.667087+00:00"state: "idle"[[Prototype]]: Object Remote:  {entity_id: 'remote.fire_tv', state: 'unknown', attributes: {…}, last_changed: '2025-08-18T15:36:03.043151+00:00', last_reported: '2025-08-18T15:36:03.043875+00:00', …}attributes: friendly_name: "Fire_TV"supported_features: 0[[Prototype]]: Objectcontext: {id: '01K2YX5GQ32CF186D3N79M9V5Z', parent_id: null, user_id: null}entity_id: "remote.fire_tv"last_changed: "2025-08-18T15:36:03.043151+00:00"last_reported: "2025-08-18T15:36:03.043875+00:00"last_updated: "2025-08-18T15:36:03.043151+00:00"state: "unknown"[[Prototype]]: Object
        const lvl = player.attributes['volume_level'] ?? 0;
        this.volume.set(Math.round(lvl * 100));
      }
    });
  }

  togglePower(): void {
    if (!this.firetv) return;
    console.log(this.firetv.isOn ? 'Powering off' : 'Powering on')
    this.firetv.isOn ? this.firetv.turnOff() : this.firetv.turnOn();
  }

  setVolume(val: number): void {
    const volumeLevel = val / 100;
    this.hass.callService('media_player', 'volume_set', {
      entity_id: 'media_player.fire_tv',
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
