import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
// Extended with `map` to transform WebSocket responses when fetching states
import {BehaviorSubject, from, Observable, Subscription, map, forkJoin, switchMap} from 'rxjs';
import {WebSocketBridgeService} from './websocketBridgeService';
import {environment} from '../../../environments/environments';
import { getSupportedMediaPlayerFeatures } from './media-player.helper';

export interface Entity {
  entity_id: string;
  state: string;

  /** ISO-String mit Zeitpunkt der letzten Statusänderung. */
  last_changed?: string;
  last_updated?: string;
  attributes: {
    friendly_name?: string;
    source?: string;
    source_list?: string[];
    volume_level?: number;
    supported_features?: number;
    is_volume_muted?: boolean;
    [key: string]: any;
  };
}

export interface HassServiceResponse {
  id: number;
  type: 'result';
  success: boolean;
  result?: any; // Optional: genau typisieren, wenn bekannt
}


@Injectable({ providedIn: 'root' })
export class HomeAssistantService {
  // Basis-URL nun relativ ("/api"), damit auch Clients aus dem Netz
  // über den Angular-Proxy auf Home Assistant zugreifen können.
  private readonly baseUrl = environment.homeAssistantUrl;
  private readonly token = environment.token;

  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });

  private readonly entitiesMap = new Map<string, Entity>();
  private readonly entitiesSubject = new BehaviorSubject<Entity[]>([]);
  public readonly entities$ = this.entitiesSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly bridge: WebSocketBridgeService) {
    this.refreshEntities();

    this.bridge.subscribeEvent('state_changed').subscribe((event:any) => {
      const newState = event.data?.new_state as Entity;
      if (newState?.entity_id) {
        this.entitiesMap.set(newState.entity_id, newState);
        this.entitiesSubject.next([...this.entitiesMap.values()]);
      }
    });
  }

  public refreshEntities(): void {
    // Aufruf erfolgt relativ, da der Dev-Server die Anfrage proxyt.
    this.http.get<Entity[]>(`${this.baseUrl}/states`, { headers: this.headers })
      .subscribe((entities) => {
        this.entitiesMap.clear();
        for (const e of entities) {
          this.entitiesMap.set(e.entity_id, e);
        }
        this.entitiesSubject.next(entities);
      });
  }

  public callService<T>(domain: string, service: string, data: any): Observable<HassServiceResponse> {
    return from(this.bridge.send({
      type: 'call_service',
      domain,
      service,
      service_data: data
    } as unknown as Omit<HassServiceResponse, "id">));
  }

  /**
   * Retrieves the full list of entity states via WebSocket.
   * Used to dynamically obtain command lists for remote controls.
   */
  public getStatesWs(): Observable<Entity[]> {
    return from(this.bridge.send({ type: 'get_states' })).pipe(
      map((res: HassServiceResponse) => res.result as Entity[])
    );
  }


  public getEntity(id: string): Entity | undefined {
    return this.entitiesMap.get(id);
  }

  public getEntitiesSnapshot(): Entity[] {
    return this.entitiesSubject.getValue();
  }

  public getAllScripts(): Entity[] {
    return this.getEntitiesSnapshot().filter(e => e.entity_id.startsWith('script.'));
  }

  public getScriptByName(name: string): Entity | undefined {
    return this.getEntitiesSnapshot().find(e => e.entity_id === `script.${name}`);
  }

  public describeScripts(): string[] {
    return this.getAllScripts().map(s => s.entity_id);
  }

  public getAllMediaplayers(name: string): Subscription {
    return this.entities$.subscribe((entities) => {
      const players = entities.filter(e => e.entity_id.startsWith(name + '.'));
      console.log('Alle MediaPlayer:', players.map(p => p.entity_id));
    });
  }

  /**
   * Lists all media_player entities provided by a specific integration platform (e.g., 'dlna_dmr')
   * together with their supported command names derived from supported_features.
   */
  public listCommandsForPlatform(platform: string): Observable<Array<{ entity_id: string; name?: string; features: string[] }>> {
    const entityRegistry$ = from(this.bridge.send({ type: 'config/entity_registry/list' })).pipe(
      map((res: any) => (res.result ?? []) as any[])
    );
    const states$ = this.getStatesWs();

    return forkJoin([entityRegistry$, states$]).pipe(
      map(([registry, states]) => {
        const targets = registry
          .filter((e: any) => e.platform === platform && e.domain === 'media_player')
          .map((e: any) => e.entity_id as string);

        return targets.map((id: string) => {
          const s = states.find(st => st.entity_id === id);
          return {
            entity_id: id,
            name: s?.attributes?.friendly_name,
            features: s ? getSupportedMediaPlayerFeatures(s) : []
          };
        });
      })
    );
  }

  /** Convenience wrapper for DLNA DMR integration. */
  public listDlnaDmrCommands(): Observable<Array<{ entity_id: string; name?: string; features: string[] }>> {
    return this.listCommandsForPlatform('dlna_dmr');
  }

  /** Returns a pretty-printed JSON string of DLNA DMR entities and their features. */
  public getDlnaDmrCommandsJson(): Observable<string> {
    return this.listDlnaDmrCommands().pipe(
      map(list => JSON.stringify(list, null, 2))
    );
  }

  // -------- FireTV commands discovery --------
  private extractCommandsFromAttrs(attrs: any): string[] {
    if (!attrs) return [];
    const candidates = ['command_list', 'commands', 'available_commands', 'extra_commands', 'supported_commands', 'command_mapping'];
    for (const key of candidates) {
      const val = attrs[key];
      if (!val) continue;
      if (Array.isArray(val)) return val.map(v => String(v));
      if (typeof val === 'string') {
        const parts = val.split(/\s*,\s*|\s+/).map(s => s.trim()).filter(Boolean);
        if (parts.length) return parts;
      }
      if (typeof val === 'object') {
        // e.g., mapping: { NAME: code }
        const keys = Object.keys(val);
        if (keys.length) return keys;
      }
    }
    return [];
  }

  private normalizeName(s?: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /** Resolve the FireTV remote entity_id from the states snapshot. */
  private resolveFireTvRemote(states: Entity[]): Entity | undefined {
    const byId = states.find(e => e.entity_id === 'remote.fire_tv');
    if (byId) return byId;

    const anyRemoteFire = states.find(e => e.entity_id.startsWith('remote.') && this.normalizeName(e.attributes?.friendly_name).includes('firetv'));
    if (anyRemoteFire) return anyRemoteFire;

    const fireMedia = states.find(e => e.entity_id === 'media_player.fire_tv' || this.normalizeName(e.attributes?.friendly_name).includes('firetv'));
    if (fireMedia) {
      const norm = this.normalizeName(fireMedia.attributes?.friendly_name);
      const matchRemote = states.find(e => e.entity_id.startsWith('remote.') && this.normalizeName(e.attributes?.friendly_name) === norm);
      if (matchRemote) return matchRemote;
    }
    return undefined;
  }

  /**
   * Try to obtain available FireTV commands from HA state attributes.
   * If none are provided by the integration, return a curated default set.
   */
  public listFireTvCommands(): Observable<{ entity_id?: string; name?: string; commands: string[]; source: 'attributes' | 'fallback' | 'none' }> {
    return this.getStatesWs().pipe(
      map((states) => {
        const remote = this.resolveFireTvRemote(states);
        if (!remote) {
          console.warn('[HA] FireTV remote not found among states.');
          return { entity_id: undefined, name: undefined, commands: [], source: 'none' as const };
        }
        console.log('[HA] FireTV remote entity:', remote.entity_id, 'attrs keys:', Object.keys(remote.attributes || {}));
        let cmds = this.extractCommandsFromAttrs(remote.attributes);

        // Additionally, try to enrich with media_player source_list (apps/inputs)
        const media = states.find(e => e.entity_id === 'media_player.fire_tv' || (e.entity_id.startsWith('media_player.') && this.normalizeName(e.attributes?.friendly_name).includes('firetv')));
        const sources: string[] = Array.isArray(media?.attributes?.source_list) ? media!.attributes!.source_list as string[] : [];
        const sourceCmds = sources.map(s => `SELECT_SOURCE:${s}`);

        if (cmds.length) {
          cmds = Array.from(new Set([...cmds, ...sourceCmds]));
          console.log('[HA] FireTV commands from attributes (+sources if any):', cmds);
          return { entity_id: remote.entity_id, name: remote.attributes?.friendly_name, commands: cmds, source: 'attributes' as const };
        }
        const fallback = [
          'POWER','HOME','BACK','UP','DOWN','LEFT','RIGHT','ENTER',
          'MENU','PLAY','PAUSE','PLAY_PAUSE','REWIND','FAST_FORWARD',
          'VOLUME_UP','VOLUME_DOWN','MUTE','SLEEP','?'
        ];
        const merged = Array.from(new Set([...fallback, ...sourceCmds]));
        console.log('[HA] FireTV commands fallback used (no attributes list exposed by integration). Added sources if present.');
        return { entity_id: remote.entity_id, name: remote.attributes?.friendly_name, commands: merged, source: 'fallback' as const };
      })
    );
  }

  /** Pretty JSON for FireTV commands to copy. */
  public getFireTvCommandsJson(): Observable<string> {
    return this.listFireTvCommands().pipe(map(x => JSON.stringify(x, null, 2)));
  }

  // -------- FireTV device actions (device_automation) --------
  private getEntityRegistry$(): Observable<any[]> {
    return from(this.bridge.send({ type: 'config/entity_registry/list' })).pipe(
      map((res: any) => (res.result ?? []) as any[])
    );
  }

  private getDeviceRegistry$(): Observable<any[]> {
    return from(this.bridge.send({ type: 'config/device_registry/list' })).pipe(
      map((res: any) => (res.result ?? []) as any[])
    );
  }

  private listActionsForDevice(device_id: string): Observable<any[]> {
    return from(this.bridge.send({ type: 'device_automation/list_actions', device_id })).pipe(
      map((res: any) => (res.result ?? []) as any[])
    );
  }

  /**
   * Discover FireTV-related devices via entity registry (androidtv/remote/media_player) and
   * return their available device actions from Home Assistant's device automation API.
   */
  public listFireTvDeviceActions(): Observable<Array<{ device_id: string; device_info?: any; entity_ids: string[]; actions: any[] }>> {
    return forkJoin([this.getEntityRegistry$(), this.getDeviceRegistry$()]).pipe(
      switchMap(([entities, devices]) => {
        const isFireEntity = (e: any) => {
          const domainOk = e.domain === 'media_player' || e.domain === 'remote';
          const platformOk = (e.platform || '').toLowerCase().includes('androidtv') || (e.platform || '').toLowerCase().includes('firetv');
          const idOk = e.entity_id === 'media_player.fire_tv' || e.entity_id === 'remote.fire_tv';
          const nameOk = (e.original_name || e.name || '').toLowerCase().includes('fire');
          return domainOk && (platformOk || idOk || nameOk);
        };

        const fireEntities = entities.filter(isFireEntity);
        const byDevice = new Map<string, { device_id: string; entity_ids: string[] }>();
        for (const e of fireEntities) {
          if (!e.device_id) continue;
          if (!byDevice.has(e.device_id)) byDevice.set(e.device_id, { device_id: e.device_id, entity_ids: [] });
          byDevice.get(e.device_id)!.entity_ids.push(e.entity_id);
        }
        const unique = Array.from(byDevice.values());

        if (unique.length === 0) {
          return from([[]]);
        }

        const actions$ = unique.map(d => this.listActionsForDevice(d.device_id).pipe(
          map(actions => {
            const info = devices.find((dev: any) => dev.id === d.device_id);
            return { device_id: d.device_id, device_info: info, entity_ids: d.entity_ids, actions };
          })
        ));
        return forkJoin(actions$);
      })
    );
  }

  public getFireTvDeviceActionsJson(): Observable<string> {
    return this.listFireTvDeviceActions().pipe(
      map(list => JSON.stringify(list, null, 2))
    );
  }

  // -------- Android TV services (domain-level capabilities) --------
  private getServices$(): Observable<Record<string, any>> {
    return from(this.bridge.send({ type: 'get_services' })).pipe(
      map((res: any) => (res.result ?? {}) as Record<string, any>)
    );
  }

  public listAndroidTvServices(): Observable<any> {
    return this.getServices$().pipe(map(all => all['androidtv'] ?? {}));
  }

  public listDomainServices(domain: string): Observable<any> {
    return this.getServices$().pipe(map(all => all[domain] ?? {}));
  }

  public getAndroidTvServicesJson(): Observable<string> {
    return this.listAndroidTvServices().pipe(
      map(svc => JSON.stringify(svc, null, 2))
    );
  }

  public listMediaPlayerServices(): Observable<any> {
    return this.listDomainServices('media_player');
  }

  public getMediaPlayerServicesJson(): Observable<string> {
    return this.listMediaPlayerServices().pipe(
      map(svc => JSON.stringify(svc, null, 2))
    );
  }

  /**
   * Aggregate everything relevant for Fire TV into a single JSON blob:
   * - media_player state and attributes
   * - decoded supported_features
   * - androidtv + media_player services (schemas)
   * - device_automation actions for related devices
   * - remote entity and extracted commands (or fallback)
   */
  public getFireTvCapabilitiesJson(): Observable<string> {
    const states$ = this.getStatesWs();
    const mpServices$ = this.listMediaPlayerServices();
    const atvServices$ = this.listAndroidTvServices();
    const actions$ = this.listFireTvDeviceActions();

    return forkJoin([states$, mpServices$, atvServices$, actions$]).pipe(
      map(([states, mpServices, atvServices, deviceActions]) => {
        // Resolve remote and media entities
        const remote = this.resolveFireTvRemote(states);
        const media = states.find(e => e.entity_id === 'media_player.fire_tv' || (e.entity_id.startsWith('media_player.') && this.normalizeName(e.attributes?.friendly_name).includes('firetv')));

        const featureMask = media?.attributes?.supported_features ?? 0;
        const featureNames = media ? getSupportedMediaPlayerFeatures(media) : [];

        // Build remote commands using same logic as listFireTvCommands()
        let remoteCmds = remote ? this.extractCommandsFromAttrs(remote.attributes) : [];
        const sources: string[] = Array.isArray(media?.attributes?.source_list) ? media!.attributes!.source_list as string[] : [];
        const sourceCmds = sources.map(s => `SELECT_SOURCE:${s}`);
        if (!remoteCmds.length) {
          const fallback = [
            'POWER','HOME','BACK','UP','DOWN','LEFT','RIGHT','ENTER',
            'MENU','PLAY','PAUSE','PLAY_PAUSE','REWIND','FAST_FORWARD',
            'VOLUME_UP','VOLUME_DOWN','MUTE','SLEEP','?'
          ];
          remoteCmds = Array.from(new Set([...fallback, ...sourceCmds]));
        } else {
          remoteCmds = Array.from(new Set([...remoteCmds, ...sourceCmds]));
        }

        const out = {
          media_player: {
            entity_id: media?.entity_id,
            state: media?.state,
            attributes: media?.attributes ?? {},
            supported_features: featureMask,
            feature_names: featureNames,
            services: mpServices
          },
          androidtv: {
            services: atvServices
          },
          remote: {
            entity_id: remote?.entity_id,
            attributes: remote?.attributes ?? {},
            commands: remoteCmds
          },
          device_automation: deviceActions,
          websocket_examples: {
            get_states: { type: 'get_states' },
            call_media_play: { type: 'call_service', domain: 'media_player', service: 'media_play', service_data: { entity_id: media?.entity_id || 'media_player.fire_tv' } },
            call_media_pause: { type: 'call_service', domain: 'media_player', service: 'media_pause', service_data: { entity_id: media?.entity_id || 'media_player.fire_tv' } },
            call_select_source_example: { type: 'call_service', domain: 'media_player', service: 'select_source', service_data: { entity_id: media?.entity_id || 'media_player.fire_tv', source: sources[0] || 'YouTube' } },
            androidtv_adb_command_example: { type: 'call_service', domain: 'androidtv', service: 'adb_command', service_data: { entity_id: media?.entity_id || 'media_player.fire_tv', command: 'HOME' } },
            subscribe_state_changed: { type: 'subscribe_events', event_type: 'state_changed' }
          }
        };

        return JSON.stringify(out, null, 2);
      })
    );
  }
}
