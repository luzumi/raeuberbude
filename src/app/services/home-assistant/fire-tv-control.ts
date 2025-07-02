import {Observable} from 'rxjs';
import {HomeAssistantService} from './home-assistant.service';

export interface FireTvEntity {
  entity_id: string;
  state: string;
  attributes: {
    app_name?: string;
    source?: string;
    device_class?: string;
    friendly_name?: string;
    supported_features?: number;
    [key: string]: any;
  };
}

export interface RemoteEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    supported_features?: number;
    [key: string]: any;
  };
}

export enum FireTvCommand {
  HOME = 'HOME',
  BACK = 'BACK',
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  SELECT = 'ENTER',
  PLAY_PAUSE = 'PLAY_PAUSE',
  POWER = 'POWER',
  SLEEP = 'SLEEP',
}

export class FireTvController {
  constructor(
    private entity: FireTvEntity,
    private remote: RemoteEntity,
    private hass: HomeAssistantService,
    private callServiceFn: (domain: string, service: string, data: any) => Observable<any>
  ) {}

  get name(): string {
    return this.entity.attributes.friendly_name ?? 'Fire TV';
  }

  get state(): string {
    return this.entity.state;
  }

  get isOn(): boolean {
    console.log(this.state)
    return this.state !== 'off' && this.state !== 'standby';
  }

  get app(): string {
    return this.entity.attributes.app_name ?? '-';
  }

  turnOn(): void {
    this.callServiceFn('media_player', 'turn_off', {
      entity_id: this.entity.entity_id
    });
    this.send(FireTvCommand.HOME);
  }

  turnOff(): void {
    this.hass.callService('remote', 'turn_on', {
      entity_id: this.entity.entity_id,
    });

  }

  send(command: FireTvCommand): void {
    this.callServiceFn('remote', 'send_command', {
      entity_id: this.remote.entity_id,
      command
    }).subscribe({
      next: (res) => console.log(`[HA] Command '${command}' erfolgreich`, res),
      error: (err) => console.error(`[HA] Fehler beim Command '${command}'`, err)
    });
  }


  home() { this.send(FireTvCommand.HOME); }
  back() { this.send(FireTvCommand.BACK); }
  up() { this.send(FireTvCommand.UP); }
  down() { this.send(FireTvCommand.DOWN); }
  left() { this.send(FireTvCommand.LEFT); }
  right() { this.send(FireTvCommand.RIGHT); }
  select() { this.send(FireTvCommand.SELECT); }
  playPause() { this.send(FireTvCommand.PLAY_PAUSE); }
}
