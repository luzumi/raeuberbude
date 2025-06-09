// Basisdaten für das Fire TV
export interface FireTvEntity {
  entity_id: string; // media_player.fire_tv
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
  entity_id: string; // remote.fire_tv
  state: string;
  attributes: {
    friendly_name?: string;
    supported_features?: number;
    [key: string]: any;
  };
}

// Hauptklasse zur Steuerung
export class FireTvBase {
  constructor(
    private entity: FireTvEntity,
    private remote: RemoteEntity,
    private callServiceFn: (domain: string, service: string, data: any) => void
  ) {}

  get name(): string {
    return this.entity.attributes.friendly_name ?? 'Fire TV';
  }

  get state(): string {
    return this.entity.state;
  }

  get isOn(): boolean {
    return this.state !== 'off' && this.state !== 'standby';
  }

  get app(): string {
    return this.entity.attributes.app_name ?? '-';
  }

  turnOn(): void {
    this.callServiceFn('media_player', 'turn_on', {
      entity_id: this.entity.entity_id
    });
  }

  turnOff(): void {
    this.callServiceFn('media_player', 'turn_off', {
      entity_id: this.entity.entity_id
    });
  }

  sendCommand(command: string): void {
    this.callServiceFn('remote', 'send_command', {
      entity_id: this.remote.entity_id,
      command
    });
  }

  // gängige Fernbedienungsbefehle
  home() { this.sendCommand('HOME'); }
  back() { this.sendCommand('BACK'); }
  up() { this.sendCommand('UP'); }
  down() { this.sendCommand('DOWN'); }
  left() { this.sendCommand('LEFT'); }
  right() { this.sendCommand('RIGHT'); }
  select() { this.sendCommand('ENTER'); }
  playPause() { this.sendCommand('PLAY_PAUSE'); }
}

// Spezialisierung: Fire TV Stick (z.B. für spezifisches Verhalten)
export class FireTvStick extends FireTvBase {
  // Beispiel: Überschreibe Verhalten bei Einschalten
  override turnOn(): void {
    super.turnOn();
    this.sendCommand('HOME');
  }
}

// Fire TV Remote-Wrapper (optional separat nutzbar)
export class FireTvRemote {
  constructor(
    private remote: RemoteEntity,
    private callServiceFn: (domain: string, service: string, data: any) => void
  ) {}

  send(command: string) {
    this.callServiceFn('remote', 'send_command', {
      entity_id: this.remote.entity_id,
      command
    });
  }

  home() { this.send('HOME'); }
  back() { this.send('BACK'); }
  up() { this.send('UP'); }
  down() { this.send('DOWN'); }
  left() { this.send('LEFT'); }
  right() { this.send('RIGHT'); }
  select() { this.send('ENTER'); }
  playPause() { this.send('PLAY_PAUSE'); }
}
