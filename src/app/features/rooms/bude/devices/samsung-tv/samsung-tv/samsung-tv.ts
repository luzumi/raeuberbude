import {OnInit, Component, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import { Entity, HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { SamsungTvService } from '@services/samsung-tv.service';
import { map } from 'rxjs';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FiretvComponent } from '../../firetv/fire-tv-component';

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

  // Command lists fetched dynamically from Home Assistant via WebSocket
  fireTvCommands: string[] = [];
  samsungCommands: string[] = [];
  selectedFireCommand?: string;
  selectedSamsungCommand?: string;

  /** Resolved entity_id for the Fire TV remote. */
  private fireRemoteId = 'remote.fire_tv';

  // --- Numeric input buffering for channel digits ---
  private digitBuffer = '';
  private digitTimer: any = null;
  private readonly digitDelayMs = 700; // ms to wait before sending buffered sequence

  @Output() deviceClicked = new EventEmitter<void>();
  /** Ermöglicht das Zurücknavigieren zur Geräteübersicht. */
  @Output() back = new EventEmitter<void>();

  constructor(
    public hass: HomeAssistantService,
    // Gemeinsamer Service, der alle Samsung-Befehle kapselt
    private readonly tv: SamsungTvService
  ) {
  }

  /**
   * Subscribe during OnInit to avoid ExpressionChangedAfterItHasBeenCheckedError
   * caused by updating template-bound values after the view was initialized.
   */
  ngOnInit(): void {
    this.hass.entities$
      .pipe(
        map((entities) => {
          const exact = entities.find(e => e.entity_id === 'media_player.tv_samsung');
          if (exact) return exact;
          const byId = entities.find(e => e.entity_id.startsWith('media_player.') && e.entity_id.toLowerCase().includes('samsung'));
          if (byId) return byId;
          const byName = entities.find(e => e.entity_id.startsWith('media_player.') && (e.attributes?.friendly_name || '').toLowerCase().includes('samsung'));
          return byName;
        })
      )
      .subscribe((entity) => {
        if (entity) {
          if (!this.samsung || this.samsung.entity_id !== entity.entity_id) {
            console.info('[SamsungTv] Verwende MediaPlayer:', entity.entity_id, '(', entity.attributes?.friendly_name, ')');
          }
          this.samsung = entity;
          this.volume = Math.round((entity.attributes.volume_level ?? 0) * 100);
        } else {
          console.warn('[SamsungTv] Kein Samsung MediaPlayer in States gefunden');
        }
      });

    // Load available command lists for FireTV and Samsung remote
    this.loadCommands();
  }

  /**
   * Requests the command lists for the remotes from Home Assistant via WebSocket.
   */
  private loadCommands(): void {
    // First, resolve FireTV commands via robust service
    this.hass.listFireTvCommands().subscribe({
      next: (res) => {
        if (res.entity_id) this.fireRemoteId = res.entity_id;
        this.fireTvCommands = res.commands?.length ? res.commands : this.defaultFireTvCommands();
        console.log('[SamsungTv] FireTV commands source=', res.source, 'count=', this.fireTvCommands.length);
      },
      error: err => console.error('[SamsungTv] FireTV commands lookup failed:', err)
    });

    // Then, fetch Samsung remote commands from states
    this.hass.getStatesWs().subscribe({
      next: (states) => {
        const samsungRemote =
          states.find(e => e.entity_id === 'remote.samsung') ??
          states.find(e => e.entity_id.startsWith('remote.') && (
            e.entity_id.toLowerCase().includes('samsung') ||
            (e.attributes?.friendly_name || '').toLowerCase().includes('samsung')
          ));
        if (!samsungRemote) {
          console.warn('[SamsungTv] Keine Samsung-Remote gefunden; verwende Default-Commandliste');
          this.samsungCommands = this.defaultSamsungCommands();
          return;
        }
        const samsungCmds = this.extractCommands(samsungRemote.attributes);
        this.samsungCommands = samsungCmds.length ? samsungCmds : this.defaultSamsungCommands();
      },
      error: err => console.error('[SamsungTv] Fehler beim Laden der Samsung-Befehle:', err)
    });
  }

  // Try to extract command arrays from various attribute keys used by different integrations
  private extractCommands(attrs: any): string[] {
    if (!attrs) return [];
    const candidates = [
      'command_list',
      'commands',
      'available_commands',
      'extra_commands',
      'supported_commands'
    ];
    for (const key of candidates) {
      const val = attrs[key];
      if (!val) continue;
      if (Array.isArray(val)) return val.map(v => v);
      if (typeof val === 'string') {
        const parts = val.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (parts.length) return parts;
      }
    }
    return [];
  }

  private defaultSamsungCommands(): string[] {
    return [
      'KEY_POWER',
      'KEY_MUTE',
      'KEY_LEFT',
      'KEY_RIGHT',
      'KEY_UP',
      'KEY_DOWN',
      'KEY_ENTER',
      'KEY_RETURN',
      'KEY_HOME',
      'KEY_SOURCE',
      'KEY_VOLUP',
      'KEY_VOLDOWN',
      'KEY_CHUP',
      'KEY_CHDOWN',
      'KEY_PLAY',
      'KEY_PAUSE',
      'KEY_STOP',
      'KEY_REWIND',
      'KEY_FF'
    ];
  }

  private defaultFireTvCommands(): string[] {
    // Fallback set analogous to HomeAssistantService.listFireTvCommands fallback
    return [
      'POWER', 'HOME', 'BACK', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER',
      'MENU', 'PLAY', 'PAUSE', 'PLAY_PAUSE', 'REWIND', 'FAST_FORWARD',
      'VOLUME_UP', 'VOLUME_DOWN', 'MUTE', 'SLEEP', '?'
    ];
  }

  // --- Numeric keypad logic ---
  onDigit(d: string): void {
    if (!/^\d$/.test(d)) return;
    this.digitBuffer += d;
    this.resetDigitTimer();
  }
  private resetDigitTimer(): void {
    if (this.digitTimer) {
      clearTimeout(this.digitTimer);
      this.digitTimer = null;
    }
    this.digitTimer = setTimeout((): void => {
      this.flushDigitBuffer();
    }, this.digitDelayMs);
  }

  private flushDigitBuffer(): void {
    if (!this.digitBuffer) return;
    const seq = this.digitBuffer;
    this.digitBuffer = '';
    this.digitTimer = null;
    this.sendDigitSequence(seq);
  }

  private sendDigitSequence(seq: string): void {
    const delayBetween = 150; // ms between individual key sends
    for ( const ch of seq.split( '' ) ) {
      const i = seq.split( '' ).indexOf( ch );
      const cmd = this.mapDigitToCommand(ch);
      setTimeout(() => this.tv.sendCommand(cmd), i * delayBetween);
    }
  }

  private mapDigitToCommand(ch: string): string {
    return `KEY_${ch}`; // Samsung remote expects KEY_0..KEY_9
  }
  /**
   * Sends the chosen FireTV command via WebSocket.
   */
  sendFireTvCommand(cmd: string): void {
    if (!cmd) return;
    this.hass.callService('remote', 'send_command', {
      entity_id: this.fireRemoteId,
      command: cmd
    }).subscribe();
  }

  /**
   * Sends the chosen Samsung TV command via WebSocket.
   */
  sendSamsungCommand(cmd: string): void {
    if (!cmd) return;
    this.tv.sendCommand(cmd);
  }
}
