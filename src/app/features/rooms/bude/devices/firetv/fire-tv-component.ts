import { Component, EventEmitter, Output, signal, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { FireTvController, FireTvEntity, RemoteEntity } from '@services/home-assistant/fire-tv-control';
import { HorizontalSlider } from '@shared/components/horizontal-slider/horizontal-slider';
import { firstValueFrom, Subscription } from 'rxjs';
import { WebSocketBridgeService, WsLogEntry } from '@services/home-assistant/websocketBridgeService';

// Curated list of common ADB key commands (accepted by androidtv.adb_command)
const ADB_KEY_COMMANDS: string[] = [
  'HOME','BACK','UP','DOWN','LEFT','RIGHT','ENTER','MENU','APP_SWITCH',
  'POWER','SLEEP','WAKEUP',
  'VOLUME_UP','VOLUME_DOWN','MUTE',
  'MEDIA_PLAY','MEDIA_PAUSE','MEDIA_PLAY_PAUSE','MEDIA_NEXT','MEDIA_PREVIOUS','MEDIA_STOP','MEDIA_REWIND','MEDIA_FAST_FORWARD'
];

// Useful ADB shell examples (also accepted by androidtv.adb_command as `command`)
const ADB_SHELL_EXAMPLES: string[] = [
  'input keyevent 3',   // HOME
  'input keyevent 4',   // BACK
  'input keyevent 19',  // UP
  'input keyevent 20',  // DOWN
  'input keyevent 21',  // LEFT
  'input keyevent 22',  // RIGHT
  'input keyevent 66',  // ENTER
  'input keyevent 82',  // MENU
  'input keyevent 187', // APP_SWITCH
  'input keyevent 26',  // POWER
  'input keyevent 223', // SLEEP
  'input keyevent 224', // WAKEUP
  'input keyevent 24',  // VOLUME_UP
  'input keyevent 25',  // VOLUME_DOWN
  'input keyevent 164', // MUTE
  'input keyevent 126', // MEDIA_PLAY
  'input keyevent 127', // MEDIA_PAUSE
  'input keyevent 85',  // MEDIA_PLAY_PAUSE
  'input keyevent 87',  // MEDIA_NEXT
  'input keyevent 88',  // MEDIA_PREVIOUS
  'input keyevent 86',  // MEDIA_STOP
  'input keyevent 89',  // MEDIA_REWIND
  'input keyevent 90',  // MEDIA_FAST_FORWARD
  "am start -a android.intent.action.VIEW -d https://www.youtube.com",
  "input text 'Hello%20World'"
];

@Component({
  selector: 'app-firetv',
  templateUrl: './fire-tv-component.html',
  styleUrl: './fire-tv-component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HorizontalSlider],
})
export class FiretvComponent implements OnDestroy, AfterViewInit {
  /** Wrapper around Home Assistant entities for Fire TV control. */
  firetv?: FireTvController;

  /** Volume level of the media player represented as percentage. */
  volume = signal(0);

  /** List of extra commands provided by Home Assistant's remote entity. */
  commands: string[] = [];

  /** Commands displayed in the on-screen keyboard (same as commands for now). */
  keyboardCommands: string[] = [];

  /** Grouped view state */
  activeGroupId: string | null = null;
  pageIndex = 0;
  readonly pageSize = 24;

  /** Groups built from curated ADB lists + dynamic HA remote commands */
  adbGroups: Array<{ id: string; title: string; items: string[]; description?: string }> = [];

  selectedCommand?: string;

  /** Resolved entity_id of the remote used for sending commands. */
  private remoteId = 'remote.fire_tv';

  @Output() deviceClick = new EventEmitter<Event>();

  // --- WS Log Viewer state ---
  showLogs = false;
  // Display list with collapsed consecutive duplicates
  wsLogs: Array<WsLogEntry & { count?: number }> = [];
  private wsLogSub?: Subscription;
  showDockedLogs = false;

  // --- WS Diagnostics ---
  diagnosticsReport?: DiagnosticsReport;

  constructor(private readonly hass: HomeAssistantService, private readonly ws: WebSocketBridgeService) {
    // React on state changes of Fire TV and its remote.
    this.hass.entities$.subscribe(entities => {
      const player = entities.find( e => e.entity_id === 'media_player.fire_tv' ) as FireTvEntity;
      // Fire TV remote under a different entity_id (e.g. `remote.as_aftmm_airplay`).
      const remote =
        (entities.find( e => e.entity_id === 'remote.fire_tv' ) as RemoteEntity) ??
        (entities.find(
          e => e.entity_id.startsWith( 'remote.' ) &&
            e.attributes?.friendly_name === player?.attributes?.friendly_name
        ) as RemoteEntity);

      if ( player && remote ) {
        this.firetv = new FireTvController( player, remote, (d, s, p) => this.hass.callService( d, s, p ) );
        this.remoteId = remote.entity_id; // remember resolved remote id
        const lvl = player.attributes['volume_level'] ?? 0;
        this.volume.set( Math.round( lvl * 100 ) );
      }
    });
  }

  ngAfterViewInit(): void {
    // Autostart per URL-Param: ?auto=adb-suite oder ?auto=ws-diag
    try {
      const url = new URL(globalThis.location.href);
      const auto = url.searchParams.get('auto') || url.hash.split('?')[1]?.split('&').find(p=>p.startsWith('auto='))?.split('=')[1];
      if (auto && /^(adb-suite|ws-diag)$/i.test(auto)) {
        // Kleines Delay, damit Services/WS initialisiert sind
        setTimeout(() => this.runWsDiagnostics(), 300);
      }
    } catch {
      // no-op: URL parsing may fail in SSR/private-mode; diagnostics remain optional
    }

    // Fetch available command list once component is constructed.
    this.loadCommands();
  }

  ngOnDestroy(): void {
    this.wsLogSub?.unsubscribe();
  }

  /** Requests the remote's command list via WebSocket. */
  private loadCommands(): void {
    // Prefer robust service-based command discovery (attributes + sources fallback)
    this.hass.listFireTvCommands().subscribe({
      next: (res) => {
        if (res.entity_id) this.remoteId = res.entity_id;
        this.commands = res.commands ?? [];
        // Merge: HA-reported commands + curated ADB keys + shell examples
        this.keyboardCommands = Array.from(new Set([
          ...this.commands,
          ...ADB_KEY_COMMANDS,
          ...ADB_SHELL_EXAMPLES
        ]));

        // Build grouped dataset for first-level navigation
        const remoteGroup = {
          id: 'remote',
          title: 'Remote (HA)',
          items: this.commands
        };
        const navigationGroup = {
          id: 'nav',
          title: 'Navigation',
          items: ['HOME','BACK','UP','DOWN','LEFT','RIGHT','ENTER','MENU','APP_SWITCH']
        };
        const playbackGroup = {
          id: 'playback',
          title: 'Playback',
          items: ['MEDIA_PLAY','MEDIA_PAUSE','MEDIA_PLAY_PAUSE','MEDIA_NEXT','MEDIA_PREVIOUS','MEDIA_STOP','MEDIA_REWIND','MEDIA_FAST_FORWARD']
        };
        const volumePowerGroup = {
          id: 'volume_power',
          title: 'Volume/Power',
          items: ['VOLUME_UP','VOLUME_DOWN','MUTE','POWER','SLEEP','WAKEUP']
        };
        const keyeventNumericGroup = {
          id: 'keyevents',
          title: 'Keyevents (input keyevent)',
          items: [
            'input keyevent 3','input keyevent 4','input keyevent 19','input keyevent 20','input keyevent 21','input keyevent 22','input keyevent 66','input keyevent 82','input keyevent 187','input keyevent 26','input keyevent 223','input keyevent 224','input keyevent 24','input keyevent 25','input keyevent 164','input keyevent 126','input keyevent 127','input keyevent 85','input keyevent 87','input keyevent 88','input keyevent 86','input keyevent 89','input keyevent 90'
          ]
        };
        const touchGroup = {
          id: 'touch',
          title: 'Touch/Gestures',
          items: [
            'input tap 500 500',
            'input swipe 100 100 900 100',
            "input text 'Hello%20World'"
          ]
        };
        const intentsGroup = {
          id: 'intents',
          title: 'Intents/Apps',
          items: [
            'am start -a android.intent.action.VIEW -d https://www.youtube.com',
            'am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS'
          ]
        };
        const packagesGroup = {
          id: 'packages',
          title: 'Packages (read-only)',
          items: [
            'pm list packages',
            'pm list packages -3'
          ]
        };
        const systemGroup = {
          id: 'system',
          title: 'System/Diagnostics',
          items: [
            'reboot',
            'screencap -p /sdcard/screen.png',
            'screenrecord /sdcard/record.mp4 --time-limit 5',
            'dumpsys power',
            'dumpsys activity recents'
          ]
        };

        // Include dynamic sources as commands
        const statesSub = this.hass.getStatesWs().subscribe(states => {
          const media = states.find(e => e.entity_id === 'media_player.fire_tv');
          const sourceList = media?.attributes?.source_list;
          const sources: string[] = Array.isArray(sourceList) ? sourceList : [];
          if (sources.length) {
            const sourceGroup = {
              id: 'sources',
              title: 'Sources/Apps (select_source)',
              items: sources.map(s => `SELECT_SOURCE:${s}`)
            };
            this.adbGroups = [remoteGroup, sourceGroup, navigationGroup, playbackGroup, volumePowerGroup, keyeventNumericGroup, touchGroup, intentsGroup, packagesGroup, systemGroup];
          } else {
            this.adbGroups = [remoteGroup, navigationGroup, playbackGroup, volumePowerGroup, keyeventNumericGroup, touchGroup, intentsGroup, packagesGroup, systemGroup];
          }
          statesSub.unsubscribe();
        });
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

  /** Handle a keyboard button press. */
  runKey(cmd: string): void {
    if (!cmd) return;
    // Special case: SELECT_SOURCE:<name>
    if (cmd.startsWith('SELECT_SOURCE:')) {
      const source = cmd.substring('SELECT_SOURCE:'.length);
      this.hass.callService('media_player', 'select_source', {
        entity_id: 'media_player.fire_tv',
        source
      }).subscribe();
      return;
    }
    // ADB keys or shell examples → androidtv.adb_command
    const isAdbKey = ADB_KEY_COMMANDS.includes(cmd);
    const isShell = /^(input\s+|am\s+)/i.test(cmd);
    if (isAdbKey || isShell) {
      this.hass.callService('androidtv', 'adb_command', {
        entity_id: 'media_player.fire_tv',
        command: cmd
      }).subscribe();
      return;
    }
    // Default: send as remote command
    this.sendCustomCommand(cmd);
  }

  /** Free-form ADB command support via androidtv.adb_command. */
  adbCmd = '';
  /** Filter string for the on-screen keyboard list. */
  filter = '';
  sendAdbCommand(): void {
    const cmd = this.adbCmd?.trim();
    if (!cmd) return;
    this.hass.callService('androidtv', 'adb_command', {
      entity_id: 'media_player.fire_tv',
      command: cmd
    }).subscribe();
  }

  // --- Test-Suite: Klickt/ruft alle ADB-Buttons/Kommandos sequenziell auf ---
  adbTestRunning = false;
  adbTestResults: Array<{ command: string; success: boolean; response?: any; error?: any }> = [];

  private isAdbLabel(cmd: string): boolean {
    return ADB_KEY_COMMANDS.includes(cmd) || /^(input\s+|am\s+)/i.test(cmd);
  }

  async runAllAdbTests(): Promise<void> {
    if (this.adbTestRunning) return;
    this.adbTestRunning = true;
    this.adbTestResults = [];

    const cmds = this.keyboardCommands.filter(c => this.isAdbLabel(c));
    for (const cmd of cmds) {
      try {
        const res = await firstValueFrom(this.hass.callService('androidtv', 'adb_command', {
          entity_id: 'media_player.fire_tv',
          command: cmd
        }));
        console.debug('[ADB][OK]', cmd, res);
        this.adbTestResults.push({ command: cmd, success: true, response: res });
      } catch (error) {
        console.error('[ADB][ERR]', cmd, error);
        this.adbTestResults.push({ command: cmd, success: false, error });
      }
      await new Promise(r => setTimeout(r, 150));
    }

    this.adbTestRunning = false;
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.adbTestResults, null, 2));
      console.info('[ADB] Test results copied to clipboard');
    } catch {
      // no-op: Clipboard API may be unavailable; results remain visible in UI
    }
  }

  copyAdbTestResults(): void {
    const json = JSON.stringify(this.adbTestResults, null, 2);
    navigator.clipboard.writeText(json).then(() => console.info('[ADB] Copied results')).catch(()=>console.warn(json));
  }

  // --- WS Logs dialog controls ---
  openLogs(): void {
    this.showLogs = true;
    this.startLogStream();
  }

  closeLogs(): void {
    this.showLogs = false;
    this.stopLogStreamIfUnused();
  }

  clearWsLogs(): void {
    this.ws.clearLogs();
    this.wsLogs = [];
  }

  // Docked logs inside the FireTV view
  toggleDockedLogs(): void {
    this.showDockedLogs = !this.showDockedLogs;
    if (this.showDockedLogs) {
      this.startLogStream();
    } else {
      this.stopLogStreamIfUnused();
    }
  }

  private startLogStream(): void {
    if (!this.wsLogSub) {
      // Build aggregated list from current snapshot
      this.wsLogs = this.aggregateSnapshot(this.ws.getLogsSnapshot());
      this.wsLogSub = this.ws.logs$.subscribe((e) => {
        const top = this.wsLogs[0];
        if (top && this.areSameForCounter(top, e)) {
          // increase counter on the latest aggregated item
          top.count = (top.count ?? 1) + 1;
          // update the displayed time to the newest event time
          top.time = e.time;
        } else {
          // push new head item
          this.wsLogs.unshift({ ...e, count: 1 });
          if (this.wsLogs.length > 500) this.wsLogs.pop();
        }
      });
    }
  }

  private stopLogStreamIfUnused(): void {
    if (!this.showLogs && !this.showDockedLogs) {
      this.wsLogSub?.unsubscribe();
      this.wsLogSub = undefined;
    }
  }

  // --- WS Diagnostics: run a suite of ADB commands and collect WS frames ---
  async runWsDiagnostics(): Promise<void> {
    const specs: AdbCommandSpec[] = [
      { label: 'HOME (key)', command: 'HOME' },
      { label: 'BACK (key)', command: 'BACK' },
      { label: 'UP (key)', command: 'UP' },
      { label: 'DOWN (key)', command: 'DOWN' },
      { label: 'LEFT (key)', command: 'LEFT' },
      { label: 'RIGHT (key)', command: 'RIGHT' },
      { label: 'ENTER (key)', command: 'ENTER' },
      { label: 'Input keyevent 3', command: 'input keyevent 3' },
      { label: 'Screenshot', command: 'screencap -p /sdcard/screen.png' }
    ];

    const report: DiagnosticsReport = {
      startedAt: new Date().toISOString(),
      runs: [],
      totals: { ok: 0, err: 0 }
    };

    for (const spec of specs) {
      const run: AdbCommandRun = {
        spec,
        startTime: new Date().toISOString(),
        frames: []
      };
      const frames: WsLogEntry[] = [];
      const sub = this.ws.logs$.subscribe(f => frames.push(f));
      const t0 = performance.now();
      try {
        const res = await firstValueFrom(this.hass.callService('androidtv', 'adb_command', {
          entity_id: 'media_player.fire_tv',
          command: spec.command
        }));
        run.id = (res as any)?.id;
        run.success = res?.success;
        run.resultPayload = res;
      } catch (error) {
        run.success = false;
        run.error = error;
      } finally {
        run.endTime = new Date().toISOString();
        run.latencyMs = Math.round(performance.now() - t0);
        sub.unsubscribe();
      }

      // Associate frames by id if known; otherwise include a short time window
      if (typeof run.id === 'number') {
        run.frames = frames.filter(fr => fr.id === run.id || (fr.dir === '->' && fr.type === 'call_service' && (fr as any)?.payload?.service_data?.command === spec.command));
      } else {
        // fallback: last ~60 frames captured during execution
        run.frames = frames.slice(-60);
      }

      report.runs.push(run);
      if (run.success) report.totals.ok++; else report.totals.err++;
      await new Promise(r => setTimeout(r, 120));
    }

    // Optional: compute per-run frame stats
    for (const r of report.runs) {
      const sent = r.frames.filter(f => f.dir === '->');
      const recv = r.frames.filter(f => f.dir === '<-');
      r.stats = {
        sentCount: sent.length,
        recvCount: recv.length,
        bytesOut: sent.reduce((a, f) => a + (f.rawLen ?? 0), 0),
        bytesIn: recv.reduce((a, f) => a + (f.rawLen ?? 0), 0)
      };
    }

    // Durchschnittslatenz berechnen
    const lat = report.runs.filter(r => typeof r.latencyMs === 'number').map(r => r.latencyMs as number);
    if (lat.length) report.totals.avgLatencyMs = Math.round(lat.reduce((a,b)=>a+b,0)/lat.length);

    report.finishedAt = new Date().toISOString();
    this.diagnosticsReport = report;
    // Exponieren für MCP/Scraper
    try { (globalThis as any).__lastDiagnostics = report; } catch { /* best-effort exposure for MCP */ }
    try { localStorage.setItem('firetv_ws_diag', JSON.stringify(report)); } catch { /* storage may be blocked */ }
  }

  async copyWsDiagnostics(): Promise<void> {
    if (!this.diagnosticsReport) return;
    const json = JSON.stringify(this.diagnosticsReport, null, 2);
    try { await navigator.clipboard.writeText(json); } catch { console.warn(json); }
  }

  downloadWsDiagnostics(): void {
    if (!this.diagnosticsReport) return;
    const blob = new Blob([JSON.stringify(this.diagnosticsReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firetv-ws-diagnostics-${new Date().toISOString().replaceAll(':','-').replaceAll('.','-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Consider events identical if core fields match and payload equals (deep)
  private areSameForCounter(a: WsLogEntry, b: WsLogEntry): boolean {
    const coreEqual = a.dir === b.dir && a.type === b.type && a.summary === b.summary && (a.rawLen ?? 0) === (b.rawLen ?? 0);
    if (!coreEqual) return false;
    const aErr = (a as any).error;
    const bErr = (b as any).error;
    if (aErr || bErr) return false;
    // Compare payload if present; treat both undefined as equal
    const aP = (a as any).payload;
    const bP = (b as any).payload;
    if (aP === undefined && bP === undefined) return true;
    try {
      return JSON.stringify(aP) === JSON.stringify(bP);
    } catch { return false; }
  }

  private aggregateSnapshot(snapshot: WsLogEntry[]): Array<WsLogEntry & { count?: number }> {
    // Snapshot is newest-first; aggregate from oldest to newest, then reverse back
    const out: Array<WsLogEntry & { count?: number }> = [];
    for (const e of [...snapshot].reverse()) {
      const last = out.at(-1);
      if (last && this.areSameForCounter(last, e)) {
        last.count = (last.count ?? 1) + 1;
        last.time = e.time;
      } else {
        out.push({ ...e, count: 1 });
      }
    }
    return out.reverse();
  }

  // --- Group navigation helpers ---
  openGroup(id: string): void {
    this.activeGroupId = id;
    this.pageIndex = 0;
  }

  backToGroups(): void {
    this.activeGroupId = null;
    this.pageIndex = 0;
  }

  get activeGroup(): { id: string; title: string; items: string[] } | null {
    return this.adbGroups.find(g => g.id === this.activeGroupId) ?? null;
  }

  get visibleCommands(): string[] {
    const items = (this.activeGroup?.items ?? []).filter(cmd => !this.filter || cmd.toLowerCase().includes(this.filter.toLowerCase()));
    const start = this.pageIndex * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const items = (this.activeGroup?.items ?? []).filter(cmd => !this.filter || cmd.toLowerCase().includes(this.filter.toLowerCase()));
    return Math.max(1, Math.ceil(items.length / this.pageSize));
  }

  nextPage(): void { if (this.pageIndex < this.totalPages - 1) this.pageIndex++; }
  prevPage(): void { if (this.pageIndex > 0) this.pageIndex--; }

  /** Toggle the power state of the Fire TV. */
  togglePower(): void {
    if (!this.firetv) return;
    console.debug(this.firetv.isOn ? 'Powering off' : 'Powering on');
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
    this.deviceClick.emit(event);
  }
}


// --- Types for WS Diagnostics ---
interface AdbCommandSpec { label: string; command: string; }
interface AdbCommandRun {
  spec: AdbCommandSpec;
  id?: number;
  startTime: string;
  endTime?: string;
  latencyMs?: number;
  frames: WsLogEntry[];
  success?: boolean;
  resultPayload?: any;
  error?: any;
  stats?: { sentCount: number; recvCount: number; bytesOut: number; bytesIn: number };
}
interface DiagnosticsReport {
  startedAt: string;
  finishedAt?: string;
  runs: AdbCommandRun[];
  totals: { ok: number; err: number; avgLatencyMs?: number };
}

