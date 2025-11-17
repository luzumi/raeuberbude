import {CommonModule} from '@angular/common';
import { SpeedometerComponent } from '@shared/components/speedometer/speedometer';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import { Entity, HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { AppButtonComponent } from '@shared/components/app-button/app-button';
import { HoverShaderDirective } from '@shared/directives/hover-shader.directive';

/**
 * Minimale Platzhalteransicht für den PC (Creator).
 */
@Component({
  selector: 'app-creator-minimal',
  standalone: true,
  imports: [CommonModule, SpeedometerComponent, AppButtonComponent, HoverShaderDirective],
  templateUrl: './creator-minimal.html',
  styleUrls: ['./creator-minimal.layout.scss'],
  host: { 'style': 'display:block;width:100%;height:100%;' }
})
export class CreatorMinimal implements OnInit, OnDestroy {
  // Zustand
  pcOn = false;
  private wasPcOn: boolean | undefined;
  // Prozentwerte + Sparklines
  cpuPercent = 0;
  ramPercent = 0;
  gpuPercent = 0;
  gpuTempC = 0;
  metric2Label: string = 'RAM';
  cpuAngle = 0;
  memAngle = 0;
  private cpuHistory: number[] = [];
  private ramHistory: number[] = [];
  cpuPath = '';
  ramPath = '';
  private readonly MAX_POINTS = 40;
  // Frequenz-Logik entfernt

  // Screenshot (Spy)
  private readonly SCREENSHOT_URL = 'http://192.168.178.24:8123/local/creator_screenshots/PC-screenshot.png';
  screenshotUrl: string = '';
  screenshotStatus: string = '';
  private screenshotRefreshInterval?: number;
  private screenshotIntervalMs: number = 1000;
  private lastScreenshotLoadAt?: number;
  private lastSpyTriggerAt?: number;
  private readonly spyRetryMs = 5000; // alle 5s Spy-Start erneut versuchen, wenn kein Bild lädt
  // Fallback-Bild (liegt im Angular assets/ Ordner). Wichtig: kein "public/" Präfix im Angular-Build verwenden.
  private readonly FALLBACK_PATH = '/assets/PC-screenshot.PNG';
  // Nach einem Ladefehler aktivieren wir für eine Haltezeit das Fallback-Bild, um Flapping zu vermeiden.
  private fallbackUntil?: number;
  private readonly fallbackHoldMs = 15000; // 15s Haltezeit, bevor wir erneut den Remote-Screenshot versuchen
  
  // ---- Digitale Uhr (UI) ----
  // Aktuelle Zeit wird 1x pro Sekunde aktualisiert und in der UI als digitale Uhr angezeigt.
  now: Date = new Date();
  private clockInterval?: number;
  // String-Getter mit führenden Nullen, damit jedes Digit stabil bleibt (kein Layout-Shift)
  get hhStr(): string { return String(this.now.getHours()).padStart(2, '0'); }
  get mmStr(): string { return String(this.now.getMinutes()).padStart(2, '0'); }
  get ssStr(): string { return String(this.now.getSeconds()).padStart(2, '0'); }
  // Boot-Guard (verhindert automatisches Spy-Starten kurz nach App-Start)
  private readonly componentInitMs = Date.now();
  private readonly defaultBootMs = 30000; // 30s

  // Gauge Backgrounds (conic-gradient)
  cpuGaugeBg = '';
  memGaugeBg = '';
  // Frequenz-Gauge entfernt
  arcBg = `conic-gradient(from -120deg,
    #e53935 0deg,      /* rot (links) */
    #ffb300 60deg,     /* orange */
    #cddc39 120deg,    /* gelb/grünlich */
    #4caf50 180deg,    /* grün */
    #26c6da 240deg,    /* türkis (rechts) */
    transparent 240deg 360deg
  )`;

  // Verfügbarkeiten/Aktionen
  wolAvailable = false;
  monitorOnAvailable = false;
  shutdownAvailable = false;
  restartAvailable = false;
  sleepAvailable = false;
  mediaAvailable = false;

  private wolAction?: { domain: string; service: string; data: any };
  private monitorOnAction?: { domain: string; service: string; data: any };
  private monitorOffAction?: { domain: string; service: string; data: any };
  private shutdownAction?: { domain: string; service: string; data: any };
  private restartAction?: { domain: string; service: string; data: any };
  private sleepAction?: { domain: string; service: string; data: any };
  private mediaEntityId?: string; // media_player.* für Play/Pause
  private onlineBinaryId?: string; // bevorzugter Online-Ping-Sensor
  private statusSensorId?: string; // bevorzugter Status-Sensor (letzter Systemstatus)
  private monitorSwitchId?: string; // optionaler Switch für Monitor (toggle)
  private monitorLastAction?: 'on' | 'off';
  // Spy/Screenshot Start/Stop
  private spyStartAction?: { domain: string; service: string; data: any };
  private spyStopAction?: { domain: string; service: string; data: any };

  private sub?: Subscription;

  constructor(private readonly hass: HomeAssistantService) {}

  ngOnInit(): void {
    // Abonniere alle Entity-Änderungen und führe Autodiscovery + Werte-Update durch
    this.sub = this.hass.entities$.subscribe( (entities) => {
      this.autodiscover( entities );
      this.updateMetricsAndState( entities );
      // Start/Stop Screenshot-Refresh je nach PC-Status
      if (this.wasPcOn !== this.pcOn) {
        if (this.pcOn) this.startScreenshotRefresh(); else this.stopScreenshotRefresh();
        this.wasPcOn = this.pcOn;
      }
    } );
    // Sicherheitsnetz: auch ohne Statuswechsel direkt versuchen zu starten
    this.loadSpyOverrideFromLocalStorage();
    this.startScreenshotRefresh();
    // Starte sekündlichen Ticker für die Uhr
    this.clockInterval = window.setInterval(() => {
      this.now = new Date();
    }, 1000);
  }

  private makeGaugeBg(percent: number, color: string): string {
    const p = Math.max(0, Math.min(100, percent));
    const angle = Math.round((p / 100) * 240); // 0..240°
    // Fülle nur den 240°-Bogen (Rest bleibt transparent)
    return `conic-gradient(from -120deg, ${color} 0deg ${angle}deg, rgba(255,255,255,0.12) ${angle}deg 240deg, transparent 240deg 360deg)`;
  }

  private angleFromPercent(percent: number): number {
    // Map 0..100% auf -120..+120 Grad (Speedometer-Stil)
    const clamped = Math.max(0, Math.min(100, percent));
    return -120 + (clamped / 100) * 240;
  }

  // ---- Helpers ----
  private norm(s?: string): string { return (s || '').toLowerCase(); }

  private textOf(e: Entity): string { return `${e.entity_id} ${(e.attributes?.friendly_name || '')}`; }

  private hasAny(hay: string, words: string[]): boolean {
    const s = this.norm(hay);
    return words.some(w => s.includes(this.norm(w)));
  }

  private pcMatches(id: string, friendly?: string): boolean {
    const x = this.norm(id) + ' ' + this.norm(friendly);
    return x.includes('creator_z590_p1') || x.includes('creator-z590-p1') || x.includes('creatorz590p1') || x.includes('creator') || x.includes('pc');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.stopScreenshotRefresh();
    // Uhr-Interval aufräumen
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = undefined;
    }
  }

  // ---- UI Actions ----
  wakePc(): void {
    if ( !this.wolAction ) return;
    this.hass.callService( this.wolAction.domain, this.wolAction.service, this.wolAction.data ).subscribe();
  }

  monitorOn(): void { this.toggleMonitor(); }

  toggleMonitor(): void {
    // 1) Switch vorhanden -> toggle
    if (this.monitorSwitchId) {
      this.hass.callService('switch', 'toggle', { entity_id: this.monitorSwitchId }).subscribe();
      return;
    }
    // 2) Button/Script on/off vorhanden -> flip basierend auf letzter Aktion
    if (this.monitorOnAction && this.monitorOffAction) {
      const doOff = this.monitorLastAction !== 'off';
      const act = doOff ? this.monitorOffAction : this.monitorOnAction;
      this.hass.callService(act.domain, act.service, act.data).subscribe();
      this.monitorLastAction = doOff ? 'off' : 'on';
      return;
    }
    // 3) Nur eine Richtung verfügbar
    if (this.monitorOffAction) {
      this.hass.callService(this.monitorOffAction.domain, this.monitorOffAction.service, this.monitorOffAction.data).subscribe();
      this.monitorLastAction = 'off';
      return;
    }
    if (this.monitorOnAction) {
      this.hass.callService(this.monitorOnAction.domain, this.monitorOnAction.service, this.monitorOnAction.data).subscribe();
      this.monitorLastAction = 'on';
      return;
    }
  }

  shutdown(): void {
    if ( !this.shutdownAction ) return;
    this.hass.callService( this.shutdownAction.domain, this.shutdownAction.service, this.shutdownAction.data ).subscribe();
  }

  restart(): void {
    if ( !this.restartAction ) return;
    this.hass.callService( this.restartAction.domain, this.restartAction.service, this.restartAction.data ).subscribe();
  }

  sleep(): void {
    if ( !this.sleepAction ) return;
    this.hass.callService( this.sleepAction.domain, this.sleepAction.service, this.sleepAction.data ).subscribe();
  }

  playPause(): void {
    if ( !this.mediaEntityId ) return;
    this.hass.callService( 'media_player', 'media_play_pause', { entity_id: this.mediaEntityId } ).subscribe();
  }

  // ---- Discovery + State ----
  private autodiscover(entities: Entity[]): void {
    // Keyword-Sets für Monitor-Erkennung
    const MON_ON_KEYS = ['monitor_on','display_on','screen_on','bildschirm an','monitor an','display an','monitoraufwachen','monitor_aufwachen','aufwecken','aufwachen'];
    const MON_OFF_KEYS = ['monitor_off','display_off','screen_off','bildschirm aus','monitor aus','display aus','monitorschlafen','monitor_schlafen','schlafen'];

    this.wolAction = undefined;
    this.monitorOnAction = undefined;
    this.monitorOffAction = undefined;
    this.shutdownAction = undefined;
    this.restartAction = undefined;
    this.sleepAction = undefined;
    this.mediaEntityId = undefined;
    this.onlineBinaryId = undefined;
    this.statusSensorId = undefined;
    this.spyStartAction = undefined;
    this.spyStopAction = undefined;
    // WOL: button/script/switch mit "wol" oder "wake"
    const wol = entities.find( e => this.pcMatches( e.entity_id, e.attributes?.friendly_name ) && e.entity_id.match( /^(button|script|switch)\./ ) && (this.norm( e.entity_id ).includes( 'wol' ) || this.norm( e.entity_id ).includes( 'wake' )) );
    if ( wol ) this.wolAction = this.toAction( wol );
    this.wolAvailable = !!this.wolAction;

    // Monitor an/aus: button/script + optional switch
    const monOn = entities.find(e => this.pcMatches(e.entity_id, e.attributes?.friendly_name) && e.entity_id.match(/^(button|script)\./) && this.hasAny(this.textOf(e), MON_ON_KEYS));
    if (monOn) this.monitorOnAction = this.toAction(monOn);
    const monOff = entities.find(e => this.pcMatches(e.entity_id, e.attributes?.friendly_name) && e.entity_id.match(/^(button|script)\./) && this.hasAny(this.textOf(e), MON_OFF_KEYS));
    if (monOff) this.monitorOffAction = this.toAction(monOff);
    const monSwitch = entities.find(e => e.entity_id.startsWith('switch.') && (this.hasAny(e.entity_id, ['monitor','display','screen']) || this.hasAny(e.attributes?.friendly_name || '', ['monitor','display','screen'])));
    this.monitorSwitchId = monSwitch?.entity_id;
    this.monitorOnAvailable = !!(this.monitorSwitchId || this.monitorOnAction || this.monitorOffAction);

    // Spy Start/Stop (z.B. Screenshot-Aufnahme)
    // Wichtig: Keine Überschneidung mit Monitor-/Display-Entitäten, um unbeabsichtigtes
    // Monitor-An/Aus zu vermeiden. Deshalb KEIN 'monitor', KEIN 'screen' und KEIN 'bild' (matcht 'bildschirm').
    const SPY_KEYS = ['spy','screenshot','capture','snapshot','snap'];
    const START_KEYS = ['start','enable','begin','on','record','aufnehmen','starten','aktivieren'];
    const STOP_KEYS = ['stop','disable','end','off','stopp','beenden','deaktivieren','anhalten'];
    const spyStart = entities.find(e => this.pcMatches(e.entity_id, e.attributes?.friendly_name)
      && e.entity_id.match(/^(button|script|switch)\./)
      && this.hasAny(this.textOf(e), SPY_KEYS)
      && this.hasAny(this.textOf(e), START_KEYS));
    if (spyStart) this.spyStartAction = this.toAction(spyStart);
    const spyStop = entities.find(e => this.pcMatches(e.entity_id, e.attributes?.friendly_name)
      && e.entity_id.match(/^(button|script|switch)\./)
      && this.hasAny(this.textOf(e), SPY_KEYS)
      && this.hasAny(this.textOf(e), STOP_KEYS));
    if (spyStop) this.spyStopAction = this.toAction(spyStop);

    // Shutdown/Restart/Sleep
    const shutdown = entities.find( e => this.pcMatches( e.entity_id, e.attributes?.friendly_name ) && e.entity_id.match( /^(button|script)\./ ) && (this.norm( e.entity_id ).includes( 'shutdown' ) || this.norm( e.entity_id ).includes( 'power_off' )) );
    if ( shutdown ) this.shutdownAction = this.toAction( shutdown );
    this.shutdownAvailable = !!this.shutdownAction;

    const restart = entities.find( e => this.pcMatches( e.entity_id, e.attributes?.friendly_name ) && e.entity_id.match( /^(button|script)\./ ) && (this.norm( e.entity_id ).includes( 'restart' ) || this.norm( e.entity_id ).includes( 'reboot' )) );
    if ( restart ) this.restartAction = this.toAction( restart );
    this.restartAvailable = !!this.restartAction;

    const sleep = entities.find( e => this.pcMatches( e.entity_id, e.attributes?.friendly_name ) && e.entity_id.match( /^(button|script)\./ ) && (this.norm( e.entity_id ).includes( 'sleep' ) || this.norm( e.entity_id ).includes( 'hibernate' )) );
    if ( sleep ) this.sleepAction = this.toAction( sleep );
    this.sleepAvailable = !!this.sleepAction;

    // Media Player für Play/Pause
    const mp = entities.find( e => e.entity_id.startsWith( 'media_player.' ) && this.pcMatches( e.entity_id, e.attributes?.friendly_name ) );
    this.mediaEntityId = mp?.entity_id;
    this.mediaAvailable = !!this.mediaEntityId;

    // Bevorzugter Online-Binary-Sensor: "Creator Online" oder "PC Online" (Ping)
    const onlineBin = entities.find(e => e.entity_id.startsWith('binary_sensor.') && (
      this.norm(e.entity_id).includes('creator_online') ||
      this.norm(e.entity_id).includes('pc_online') ||
      (e.attributes?.friendly_name || '').toLowerCase() === 'creator online' ||
      (e.attributes?.friendly_name || '').toLowerCase() === 'pc online' ||
      (this.pcMatches(e.entity_id, e.attributes?.friendly_name) && this.norm(e.entity_id).includes('online'))
    ));
    this.onlineBinaryId = onlineBin?.entity_id;

    // Bevorzugter Status-Sensor: letztes Systemstatus-Änderung (z.B. CREATOR-Z590-P1_letztesystemstatus_nderung)
    const statusSensor = entities.find(e => e.entity_id.startsWith('sensor.') && (
      this.norm(e.entity_id).includes('letztesystemstatus') ||
      this.norm(e.entity_id).includes('status_anderung') ||
      this.norm(e.entity_id).includes('statusanderung') ||
      (e.attributes?.friendly_name || '').toLowerCase().includes('letzte') && (e.attributes?.friendly_name || '').toLowerCase().includes('status')
    ));
    this.statusSensorId = statusSensor?.entity_id;
  }

  private toAction(e: Entity): { domain: string; service: string; data: any } {
    const domain = e.entity_id.split('.')[0];
    const data = { entity_id: e.entity_id };
    let service = 'turn_on';
    if (domain === 'button') service = 'press';
    if (domain === 'switch') service = 'turn_on';
    if (domain === 'script') service = 'turn_on';
    return { domain, service, data };
  }

  private toActionById(entityId: string): { domain: string; service: string; data: any } {
    const domain = entityId.split('.')[0];
    const data = { entity_id: entityId };
    let service = 'turn_on';
    if (domain === 'button') service = 'press';
    if (domain === 'switch') service = 'turn_on';
    if (domain === 'script') service = 'turn_on';
    return { domain, service, data };
  }

  private updateMetricsAndState(entities: Entity[]): void {
    // CPU und RAM Sensoren finden
    const by = (pred: (e: Entity) => boolean) => entities.find(pred);
    const isCreator = (e: Entity) => this.pcMatches(e.entity_id, e.attributes?.friendly_name);

    // Priorisierte exakte Sensoren
    const cpuExact = by(e => e.entity_id.startsWith('sensor.') && this.pcMatches(e.entity_id, e.attributes?.friendly_name) && this.norm(e.entity_id).endsWith('_cpulast'));
    const gpuExact = by(e => e.entity_id.startsWith('sensor.') && this.pcMatches(e.entity_id, e.attributes?.friendly_name) && this.norm(e.entity_id).endsWith('_gpulast'));

    const cpu = cpuExact ?? by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && (
      this.hasAny(e.entity_id, ['cpu']) || this.hasAny(e.attributes?.friendly_name || '', ['cpu'])
    ) && (
      this.hasAny(e.entity_id, ['usage','load','percent','last','auslast','auslastung','util']) || this.hasAny(e.attributes?.friendly_name || '', ['usage','load','percent','last','auslastung','util'])
    ));
    const ram = by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && (
      this.hasAny(e.entity_id, ['ram','memory','arbeitsspeicher','speicher']) || this.hasAny(e.attributes?.friendly_name || '', ['ram','memory','arbeitsspeicher','speicher'])
    ) && (
      this.hasAny(e.entity_id, ['used','usage','percent','last','auslast','auslastung']) || this.hasAny(e.attributes?.friendly_name || '', ['used','usage','percent','last','auslastung'])
    ));
    const gpu = gpuExact ?? by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && (
      this.hasAny(e.entity_id, ['gpu']) || this.hasAny(e.attributes?.friendly_name || '', ['gpu'])
    ) && (
      this.hasAny(e.entity_id, ['usage','load','percent','last','auslast','auslastung','util']) || this.hasAny(e.attributes?.friendly_name || '', ['usage','load','percent','last','auslastung','util'])
    ));
    // GPU-Temperatur (optional)
    const gpuTempSensor = by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && (
      this.hasAny(e.entity_id, ['gpu','graphics']) || this.hasAny(e.attributes?.friendly_name || '', ['gpu','graphics'])
    ) && (
      this.hasAny(e.entity_id, ['temp','temperature','temperatur','°c','celsius']) || this.hasAny(e.attributes?.friendly_name || '', ['temp','temperature','temperatur','°c','celsius'])
    ));
    // GPU-Temperatur-Sensor robust ermitteln
    const gpuTempExact = by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && this.norm(e.entity_id).endsWith('_gputemperatur'));
    const looksLikeTempUnit = (e: Entity) => {
      const u = (e.attributes?.['unit_of_measurement'] || '').toString().toLowerCase();
      return u.includes('°c') || u.includes('celsius') || u === 'c' || u.includes('°f') || u.includes('fahrenheit') || u.includes('k');
    };
    const isTempClass = (e: Entity) => (e.attributes?.['device_class'] || '').toString().toLowerCase() === 'temperature';
    const gpuTemp = gpuTempExact ?? by(e => e.entity_id.startsWith('sensor.') && isCreator(e) && (
      (this.hasAny(e.entity_id + ' ' + (e.attributes?.friendly_name || ''), ['gpu','grafik']) && this.hasAny(e.entity_id + ' ' + (e.attributes?.friendly_name || ''), ['temp','temperatur','temperature']))
      || (this.hasAny(e.entity_id + ' ' + (e.attributes?.friendly_name || ''), ['gpu','grafik']) && (isTempClass(e) || looksLikeTempUnit(e)))
    ));
    // Frequenz-Sensor-Ermittlung entfernt

    // Werte extrahieren als Prozent (0..100)
    const toPercent = (e?: Entity): number => {
      if (!e) return 0;
      const rawStr = typeof e.state === 'number' ? String(e.state) : String(e.state || '');
      let val = typeof e.state === 'number' ? e.state : Number.parseFloat(rawStr.replace(',', '.'));
      if (!isFinite(val)) return 0;
      const unit = (e.attributes?.['unit_of_measurement'] || '').toString().toLowerCase();
      // Falls Einheit Prozent oder Wert sehr klein (0..1): auf 0..100 skalieren
      if (unit.includes('%')) {
        if (val <= 1) val *= 100;
      } else {
        if (val <= 1) val *= 100;
      }
      return Math.max(0, Math.min(100, val));
    };
    // Zahl ohne Prozent-Transformation
    const toNumber = (e?: Entity): number => {
      if (!e) return 0;
      const rawStr = typeof e.state === 'number' ? String(e.state) : String(e.state || '');
      const val = typeof e.state === 'number' ? e.state : Number.parseFloat(rawStr.replace(',', '.'));
      return isFinite(val) ? val : 0;
    };
    // Temperatur auf °C normalisieren
    const toCelsius = (e?: Entity): number => {
      if (!e) return 0;
      const rawStr = typeof e.state === 'number' ? String(e.state) : String(e.state || '');
      let val = typeof e.state === 'number' ? e.state : Number.parseFloat(rawStr.replace(',', '.'));
      if (!isFinite(val)) return 0;
      const unit = (e.attributes?.['unit_of_measurement'] || '').toString().toLowerCase();
      if (unit.includes('°f') || unit.includes('fahrenheit') || unit === 'f') {
        val = (val - 32) * 5/9;
      } else if (unit === 'k' || unit.includes(' kelvin') || unit === 'kelvin') {
        val = val - 273.15;
      }
      return Math.max(0, Math.min(110, val));
    };

    const cpuVal = cpu ? toPercent(cpu) : 0;
    // CPU/GPU/RAM getrennt berechnen
    this.cpuPercent = cpuVal;
    this.gpuPercent = gpu ? toPercent(gpu) : 0;
    this.ramPercent = ram ? toPercent(ram) : 0;
    this.gpuTempC = gpuTemp ? Math.round(toCelsius(gpuTemp)) : 0;
    this.metric2Label = this.gpuPercent ? 'GPU %' : 'RAM %';

    // Frequenzwert-Logik entfernt; rechter Gauge zeigt CPU-Last

    // History fortschreiben
    this.pushHistory(this.cpuHistory, cpuVal);
    this.pushHistory(this.ramHistory, this.ramPercent);
    this.cpuPath = this.buildPath(this.cpuHistory);
    this.ramPath = this.buildPath(this.ramHistory);

    // Gauge-Hintergründe aktualisieren
    this.cpuGaugeBg = this.makeGaugeBg(this.cpuPercent, '#90caf9');
    this.memGaugeBg = this.makeGaugeBg(this.ramPercent, '#80e27e');
    // Frequenz-Gauge entfernt

    // Needle-Winkel aktualisieren
    this.cpuAngle = this.angleFromPercent(this.cpuPercent);
    this.memAngle = this.angleFromPercent(this.ramPercent);
    // Frequenz-Gauge entfernt

    // PC-On Heuristik
    const mp = this.mediaEntityId ? entities.find(e => e.entity_id === this.mediaEntityId) : undefined;
    const mpOn = mp ? (mp.state && mp.state !== 'off' && mp.state !== 'unavailable') : false;
    const onlineBinary = this.onlineBinaryId
      ? entities.find(e => e.entity_id === this.onlineBinaryId)
      : entities.find(e => e.entity_id.startsWith('binary_sensor.') && isCreator(e) && (e.entity_id.toLowerCase().includes('online') || e.entity_id.toLowerCase().includes('power')));
    const online = onlineBinary ? onlineBinary.state === 'on' : false;
    // Frequenzsensor: online, wenn vorhanden und numerisch > 0
    const cpuOnline = !!cpu && cpu.state !== 'unavailable' && cpu.state !== 'unknown';
    const ramOnline = !!ram && ram.state !== 'unavailable' && ram.state !== 'unknown';
    // Verfügbarkeiten werden in autodiscover gesetzt
    // Priorität 1: Status-Sensor (letzte Systemstatus-Änderung)
    if (this.statusSensorId) {
      const s = entities.find(e => e.entity_id === this.statusSensorId);
      const val = (s?.state || '').toString().toLowerCase();
      const onlineEvents = new Set(['hassagentstarted','resume','consoleconnect','remoteconnect','sessionlogon','sessionunlock','sessionremotecontrol']);
      const offlineEvents = new Set(['logoff','systemshutdown','suspend','consoledisconnect','remotedisconnect','sessionlock','sessionlogoff']);
      const statusOnline = onlineEvents.has(val) || (!offlineEvents.has(val) && (val.includes('resume') || val.includes('start') || val.includes('logon') || val.includes('unlock') || val.includes('connect')));
      this.pcOn = statusOnline;
      return;
    }

    // Priorität 2: Ping-Binary-Sensor – Single Source of Truth
    if (this.onlineBinaryId) {
      this.pcOn = online;
      return;
    }

    // Fallback: Frequenz-/Media-/CPU-/RAM-Heuristik
    this.pcOn = mpOn || online || cpuOnline || ramOnline || cpuVal > 0 || this.gpuPercent > 0 || this.ramPercent > 0;
  }

  // --- Screenshot Refresh ---
  private startScreenshotRefresh(): void {
    // bereits aktiv? Dann nichts tun
    if (this.screenshotRefreshInterval) return;
    // versuche ggf. Spy-Aufnahme zu starten
    if (!this.spyStartAction) {
      console.debug('[CreatorMinimal] no spy start action found (autodiscovery). You can set localStorage keys "creator.spyStart"/"creator.spyStop" with entity_id to override.');
    }
    if (this.spyAutoStartEnabled()) {
      this.startSpyCapture();
    }
    this.updateScreenshotUrl();
    this.screenshotRefreshInterval = window.setInterval(() => {
      // Wenn seit > spyRetryMs kein Bild geladen wurde → Spy erneut starten
      const now = Date.now();
      const lastOk = this.lastScreenshotLoadAt ?? 0;
      const lastSpy = this.lastSpyTriggerAt ?? 0;
      if (this.spyAutoStartEnabled() && now - lastOk > this.spyRetryMs && now - lastSpy > this.spyRetryMs) {
        console.debug('[CreatorMinimal] screenshot stale, retry spy-start');
        this.startSpyCapture();
      }
      this.updateScreenshotUrl();
    }, this.screenshotIntervalMs);
  }

  private stopScreenshotRefresh(): void {
    if (this.screenshotRefreshInterval) {
      clearInterval(this.screenshotRefreshInterval);
      this.screenshotRefreshInterval = undefined;
    }
    // versuche ggf. Spy-Aufnahme zu stoppen
    if (this.spyAutoStartEnabled()) this.stopSpyCapture();
  }

  private updateScreenshotUrl(): void {
    // Wenn ein vorheriger Fehler auftrat, halten wir das Fallback-Bild für eine kurze Zeit aktiv,
    // um sichtbares Flackern (Layout-Shift) und permanente Fehlversuche zu vermeiden.
    if (this.fallbackUntil && Date.now() < this.fallbackUntil) {
      // Während der Haltezeit belassen wir die URL unverändert (Fallback aktiv).
      return;
    }
    const t = Date.now();
    this.screenshotUrl = `${this.SCREENSHOT_URL}?t=${t}`;
    // Log zur Diagnose (kann später entfernt werden)
    console.debug('[CreatorMinimal] refresh screenshot', this.screenshotUrl);
  }

  private startSpyCapture(): void {
    if (!this.spyStartAction) return;
    const id = (this.spyStartAction.data?.entity_id || '').toLowerCase();
    if (!this.isSpyEntityIdSafe(id)) {
      console.warn('[CreatorMinimal] skip spy start (unsafe entity)', id);
      return;
    }
    this.lastSpyTriggerAt = Date.now();
    console.debug('[CreatorMinimal] call spy start', this.spyStartAction);
    this.hass.callService(this.spyStartAction.domain, this.spyStartAction.service, this.spyStartAction.data).subscribe();
  }

  private stopSpyCapture(): void {
    // Nur stoppen, wenn ein Start zuvor ausgelöst wurde (Schutz gegen Fehlklassifizierungen)
    if (!this.spyStopAction || !this.lastSpyTriggerAt) return;
    const id = (this.spyStopAction.data?.entity_id || '').toLowerCase();
    if (!this.isSpyEntityIdSafe(id)) {
      console.warn('[CreatorMinimal] skip spy stop (unsafe entity)', id);
      return;
    }
    console.debug('[CreatorMinimal] call spy stop', this.spyStopAction);
    this.hass.callService(this.spyStopAction.domain, this.spyStopAction.service, this.spyStopAction.data).subscribe();
  }

  private loadSpyOverrideFromLocalStorage(): void {
    try {
      const s = localStorage.getItem('creator.spyStart');
      const p = localStorage.getItem('creator.spyStop');
      if (s && this.isSpyEntityIdSafe(s)) this.spyStartAction = this.toActionById(s);
      if (p && this.isSpyEntityIdSafe(p)) this.spyStopAction = this.toActionById(p);
      if (s || p) console.debug('[CreatorMinimal] loaded spy overrides from localStorage', { s, p });
    } catch {
      // no-op: localStorage may be unavailable (privacy/SSR); override is optional
    }
  }

  private isSpyEntityIdSafe(entityId: string): boolean {
    const id = (entityId || '').toLowerCase();
    const deny = ['monitor','display','screen','bildschirm','shutdown','power_off','sleep','hibernate','monitor_off','display_off','screen_off'];
    if (deny.some(k => id.includes(k))) return false;
    const allow = ['spy','screenshot','snapshot','capture','snap'];
    return allow.some(k => id.includes(k));
  }

  private spyAutoStartEnabled(): boolean {
    try {
      const auto = localStorage.getItem('creator.spyAutoStart') === 'true';
      const allow = localStorage.getItem('ha.allowSpyAutoStart') === 'true';
      return auto && allow && !this.isBootWindowActive();
    } catch {
      return false;
    }
  }

  private isBootWindowActive(): boolean {
    const now = Date.now();
    let guardMs = this.defaultBootMs;
    try {
      const override = localStorage.getItem('ha.guardBootMs');
      const n = override ? Number.parseInt(override, 10) : NaN;
      if (Number.isFinite(n) && n >= 0) guardMs = n;
    } catch {
      // no-op: on storage access failure keep defaultBootMs as guard window
    }
    const active = (now - this.componentInitMs) < guardMs;
    if (active) {
      console.debug('[CreatorMinimal][GUARD] Boot-Fenster aktiv – Spy-Autostart unterdrückt');
    }
    return active;
  }

  onScreenshotLoad(): void {
    this.screenshotStatus = 'Bild aktualisiert';
    this.lastScreenshotLoadAt = Date.now();
    console.debug('[CreatorMinimal] screenshot loaded ok');
    // Sobald der Remote-Screenshot wieder erfolgreich lädt, heben wir die Fallback-Haltezeit auf.
    if (this.screenshotUrl !== this.FALLBACK_PATH) {
      this.fallbackUntil = undefined;
    }
  }

  onScreenshotError(): void {
    // Fehler beim Laden: aktiviere Fallback-Bild (einmalig) und halte es für eine definierte Zeitspanne.
    // So verhindern wir ein schnelles Hin- und Herspringen zwischen Remote-URL und Fallback.
    this.screenshotStatus = 'Fehler beim Laden – Fallback aktiviert';
    // Falls das Fallback bereits aktiv ist, keine erneute Aktion (verhindert Endlos-Loops bei Fallback-Fehlern).
    if (this.screenshotUrl === this.FALLBACK_PATH) {
      console.warn('[CreatorMinimal] screenshot error (fallback already active)');
      return;
    }
    this.fallbackUntil = Date.now() + this.fallbackHoldMs;
    this.screenshotUrl = this.FALLBACK_PATH;
    console.warn('[CreatorMinimal] screenshot error → switching to fallback for', this.fallbackHoldMs, 'ms');
  }

  getCurrentTimestamp(): string {
    return new Date().toLocaleTimeString();
  }

  private pushHistory(arr: number[], val: number): void {
    arr.push(val);
    if (arr.length > this.MAX_POINTS) arr.shift();
    // Seed initial, damit der Graph nicht leer startet
    if (arr.length < Math.min(5, this.MAX_POINTS) && arr.length === 1) {
      while (arr.length < 10) arr.push(val);
    }
  }

  private buildPath(values: number[]): string {
    if ( !values.length ) return '';
    const w = 100;
    const h = 24;
    const n = values.length;
    const step = n > 1 ? w / (n - 1) : w;
    const pts: Array<{ x: number; y: number }> = values.map( (v, i) => ({
      x: Math.round( i * step * 100 ) / 100,
      y: Math.round( (h - (v / 100) * h) * 100 ) / 100
    }) );
    let d = `M ${ pts[0].x } ${ pts[0].y }`;
    for ( let i = 1; i < pts.length; i++ ) {
      d += ` L ${ pts[i].x } ${ pts[i].y }`;
    }
    return d;
  }
}
