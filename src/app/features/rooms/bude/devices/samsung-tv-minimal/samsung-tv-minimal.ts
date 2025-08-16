import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entity, HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-samsung-tv-minimal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule],
  templateUrl: './samsung-tv-minimal.html',
  styleUrls: ['./samsung-tv-minimal.scss'],
})
export class SamsungTvMinimal implements OnInit {
  samsung?: Entity;
  sourceList: string[] = [];
  selectedSource?: string;

  constructor(private hass: HomeAssistantService) {}

  /**
   * Subscribe to TV entity changes to keep status information up to date.
   */
  ngOnInit(): void {
    this.hass.entities$.subscribe(entities => {
      const entity = entities.find(e => e.entity_id === 'media_player.tv_samsung');
      if (entity) {
        this.samsung = entity;
        // Cache available sources for quick selection in the header
        this.sourceList = entity.attributes['source_list'] ?? [];
        this.selectedSource = entity.attributes['source'];
      }
    });
  }

  /**
   * Toggle the TV's power state using Home Assistant's remote service.
   */
  togglePower(): void {
    const state = this.samsung?.state ?? 'off';
    this.hass.callService('remote', state === 'on' ? 'turn_off' : 'turn_on', {
      entity_id: 'remote.samsung'
    }).subscribe();
  }

  /** Increase the TV volume by one step. */
  volumeUp(): void {
    this.hass.callService('media_player', 'volume_up', {
      entity_id: 'media_player.tv_samsung'
    }).subscribe();
  }

  /** Decrease the TV volume by one step. */
  volumeDown(): void {
    this.hass.callService('media_player', 'volume_down', {
      entity_id: 'media_player.tv_samsung'
    }).subscribe();
  }

  /** Jump to the next channel. */
  channelUp(): void {
    this.sendSamsungCommand('channelup');
  }

  /** Jump to the previous channel. */
  channelDown(): void {
    this.sendSamsungCommand('channeldown');
  }

  /**
   * Change the current input source.
   */
  changeSource(): void {
    if (!this.selectedSource) return;
    this.hass.callService('media_player', 'select_source', {
      entity_id: 'media_player.tv_samsung',
      source: this.selectedSource
    }).subscribe();
  }

  /**
   * Helper to send a raw Samsung remote command.
   */
  private sendSamsungCommand(cmd: string): void {
    this.hass.callService('remote', 'send_command', {
      entity_id: 'remote.samsung',
      command: cmd
    }).subscribe();
  }

  // --- Status getters used in the template ---
  get name(): string {
    return this.samsung?.attributes.friendly_name ?? 'Samsung TV';
  }

  get state(): string {
    return this.samsung?.state ?? '-';
  }

  get source(): string {
    return this.samsung?.attributes['source'] ?? '-';
  }

  get volume(): number {
    const lvl = this.samsung?.attributes['volume_level'] ?? 0;
    return Math.round(lvl * 100);
  }
}

