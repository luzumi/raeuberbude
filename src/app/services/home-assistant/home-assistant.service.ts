import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {BehaviorSubject, from, Observable, Subscription} from 'rxjs';
import {WebSocketBridgeService} from './websocketBridgeService';
import {environment} from '../../../environments/environments';

export interface Entity {
  entity_id: string;
  state: string;
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
  private readonly baseUrl = environment.homeAssistantUrl;
  private readonly token = environment.token;

  // Default headers including the Home Assistant token used for every HTTP request
  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });

  private readonly entitiesMap = new Map<string, Entity>();
  private readonly entitiesSubject = new BehaviorSubject<Entity[]>([]);
  public readonly entities$ = this.entitiesSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly bridge: WebSocketBridgeService) {
    // Initial entities load on service construction
    this.refreshEntities();

    // Keep entity list in sync by listening to Home Assistant state changes
    this.bridge.subscribeEvent('state_changed').subscribe((event:any) => {
      const newState = event.data?.new_state as Entity;
      if (newState?.entity_id) {
        this.entitiesMap.set(newState.entity_id, newState);
        this.entitiesSubject.next([...this.entitiesMap.values()]);
      }
    });
  }

  /**
   * Fetches the current state of all entities from Home Assistant and updates
   * the local cache as well as the observable stream.
   */
  public refreshEntities(): void {
    this.http.get<Entity[]>(`${this.baseUrl}/api/states`, { headers: this.headers })
      .subscribe((entities) => {
        this.entitiesMap.clear();
        for (const e of entities) {
          this.entitiesMap.set(e.entity_id, e);
        }
        this.entitiesSubject.next(entities);
      });
  }

  /**
   * Calls a Home Assistant service on a given domain.
   * @param domain Service domain (e.g. 'light').
   * @param service Service name (e.g. 'turn_on').
   * @param data Payload sent with the service call.
   */
  public callService<T>(domain: string, service: string, data: any): Observable<HassServiceResponse> {
    return from(this.bridge.send({
      type: 'call_service',
      domain,
      service,
      service_data: data
    } as unknown as Omit<HassServiceResponse, "id">));
  }

  /**
   * Returns an entity by its identifier from the local cache.
   */
  public getEntity(id: string): Entity | undefined {
    return this.entitiesMap.get(id);
  }

  /**
   * Snapshot of all currently cached entities.
   */
  public getEntitiesSnapshot(): Entity[] {
    return this.entitiesSubject.getValue();
  }

  /**
   * Returns all entities that represent Home Assistant scripts.
   */
  public getAllScripts(): Entity[] {
    return this.getEntitiesSnapshot().filter(e => e.entity_id.startsWith('script.'));
  }

  /**
   * Finds a script entity by its simple name (without the `script.` prefix).
   */
  public getScriptByName(name: string): Entity | undefined {
    return this.getEntitiesSnapshot().find(e => e.entity_id === `script.${name}`);
  }

  /**
   * Provides a list of script identifiers for debugging or display purposes.
   */
  public describeScripts(): string[] {
    return this.getAllScripts().map(s => s.entity_id);
  }

  /**
   * Logs all media player entities that match a given domain name to the console.
   * @returns Subscription that can be used to stop listening.
   */
  public getAllMediaplayers(name: string): Subscription {
    return this.entities$.subscribe((entities) => {
      const players = entities.filter(e => e.entity_id.startsWith(name + '.'));
      console.log('Alle MediaPlayer:', players.map(p => p.entity_id));
    });
  }
}
