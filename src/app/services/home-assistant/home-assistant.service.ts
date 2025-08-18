import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
// Extended with `map` to transform WebSocket responses when fetching states
import {BehaviorSubject, from, Observable, Subscription, map} from 'rxjs';
import {WebSocketBridgeService} from './websocketBridgeService';
import {ConfigService} from '../config-service';

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
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly headers: HttpHeaders;

  private readonly entitiesMap = new Map<string, Entity>();
  private readonly entitiesSubject = new BehaviorSubject<Entity[]>([]);
  public readonly entities$ = this.entitiesSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly bridge: WebSocketBridgeService,
              private readonly config: ConfigService) {
    // Basis-URL und Token stammen nun aus dem ConfigService, damit die App auch
    // über andere Hosts (z.B. 0.0.0.0) korrekt mit Home Assistant spricht.
    this.baseUrl = this.config.homeAssistantUrl;
    this.token = this.config.token;
    this.headers = new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });

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
    this.http.get<Entity[]>(`${this.baseUrl}/api/states`, { headers: this.headers })
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
}
