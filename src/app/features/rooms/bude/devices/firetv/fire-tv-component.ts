import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { FireTvController, FireTvEntity, RemoteEntity } from '@services/home-assistant/fire-tv-control';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';

@Component({
  selector: 'app-firetv',
  templateUrl: './fire-tv-component.html',
  styleUrl: './fire-tv-component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HorizontalSlider],
})
export class FiretvComponent {
  /** Wrapper around Home Assistant entities for Fire TV control. */
  firetv?: FireTvController;

  /** Volume level of the media player represented as percentage. */
  volume = signal(0);

  /** List of extra commands provided by Home Assistant's remote entity. */
  commands: string[] = [];

  /** Currently selected command from the dropdown. */
  selectedCommand?: string;

  /** Resolved entity_id of the remote used for sending commands. */
  private remoteId = 'remote.fire_tv';

  @Output() onDeviceClick = new EventEmitter<Event>();

  constructor(private readonly hass: HomeAssistantService) {
    // React on state changes of Fire TV and its remote.
    this.hass.entities$.subscribe(entities => {
      const player = entities.find(e => e.entity_id === 'media_player.fire_tv') as FireTvEntity;

      // Try to resolve the matching remote entity. Some setups expose the
      // Fire TV remote under a different entity_id (e.g. `remote.as_aftmm_airplay`).
      const remote =
        (entities.find(e => e.entity_id === 'remote.fire_tv') as RemoteEntity) ??
        (entities.find(
          e => e.entity_id.startsWith('remote.') &&
            e.attributes?.friendly_name === player?.attributes?.friendly_name
        ) as RemoteEntity);

      if (player && remote) {
        this.firetv = new FireTvController(player, remote, (d, s, p) => this.hass.callService(d, s, p));
        this.remoteId = remote.entity_id; // remember resolved remote id
        const lvl = player.attributes['volume_level'] ?? 0;
        this.volume.set(Math.round(lvl * 100));
      }
    });

    // Fetch available command list once component is constructed.
    this.loadCommands();
  }

  /** Requests the remote's command list via WebSocket. */
  private loadCommands(): void {
    this.hass.getStatesWs().subscribe({
      next: (states) => {
        // Fallback search mirrors the logic from the entity subscription above.
        const player = states.find(e => e.entity_id === 'media_player.fire_tv');
        const remote =
          states.find(e => e.entity_id === 'remote.fire_tv') ||
          states.find(
            e => e.entity_id.startsWith('remote.') &&
              e.attributes?.friendly_name === player?.attributes?.friendly_name
          );

        this.commands = remote?.attributes?.['command_list'] ?? [];
      },
      error: (err) => console.error('[FiretvComponent] Fehler beim Laden der Befehle:', err)
    });
  }

  /** Sends a custom Fire TV command chosen from the dropdown. */
  sendCustomCommand(cmd: string): void {
    if (!cmd) return;
    this.hass.callService('remote', 'send_command', {
      // Use resolved remote or fall back to the default entity id.
      entity_id: this.remoteId,
      command: cmd
    }).subscribe();
  }

  /** Toggle the power state of the Fire TV. */
  togglePower(): void {
    if (!this.firetv) return;
    console.log(this.firetv.isOn ? 'Powering off' : 'Powering on');
    this.firetv.isOn ? this.firetv.turnOff() : this.firetv.turnOn();
  }

  /** Adjust the Fire TV volume through Home Assistant. */
  setVolume(val: number): void {
    const volumeLevel = val / 100;
    this.hass.callService('media_player', 'volume_set', {
      entity_id: 'media_player.fire_tv',
      volume_level: volumeLevel
    });
    this.volume.set(val);
  }

  /** Name reported by Home Assistant for display. */
  get name(): string {
    return this.firetv?.name ?? 'Fire TV';
  }

  /** Current power/state string of the Fire TV. */
  get state(): string {
    return this.firetv?.state ?? '-';
  }

  /** Currently active app on the Fire TV. */
  get app(): string {
    return this.firetv?.app ?? '-';
  }

  onDeviceClicked(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.onDeviceClick.emit(event);
  }
}

