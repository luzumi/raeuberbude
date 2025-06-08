import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {environment} from '../../environments/environment';
import {MediaPlayerFeature} from './MediaPlayerFeatures';

export interface Entity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    source?: string;
    source_list?: string[];
    volume_level?: number;
    [key: string]: any;
  };
}

@Injectable({ providedIn: 'root' })
export class HomeAssistant {
  private readonly baseUrl = environment.homeAssistantUrl;
  private readonly token = environment.token;
  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });

  private ws?: WebSocket;
  private msgId = 1;
  private pending = new Map<number, (result: any) => void>();
  private connected = false;

  private entitiesMap = new Map<string, Entity>();
  private entitiesSubject = new BehaviorSubject<Entity[]>([]);
  public readonly entities$ = this.entitiesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initWebSocket();
    this.refreshEntities(); // REST-Ladevorgang bei Start

  }

  /** Initiale Ladung via REST */
  public refreshEntities(): void {
    this.http.get<Entity[]>(`${this.baseUrl}/api/states`, { headers: this.headers })
      .subscribe((entities) => {
        this.entitiesMap.clear();
        for (const e of entities) this.entitiesMap.set(e.entity_id, e);
        this.entitiesSubject.next(entities);
      });
  }

  /** REST-Service-Aufruf */
  public callService(domain: string, service: string, data: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/services/${domain}/${service}`,
      data,
      { headers: this.headers }
    );
  }

  public getSupportedMediaPlayerFeatures(entityId: string): string[] {
    const entity = this.entitiesMap.get(entityId);
    if (!entity) return [];

    const supported = entity.attributes?.['supported_features'] ?? 0;

    return Object.entries(MediaPlayerFeature)
      .filter(([key, bit]) => typeof bit === 'number' && (supported & bit) !== 0)
      .map(([key]) => key);
  }

  /** Zugriff auf ein einzelnes Entity */
  public getEntity(id: string): Entity | undefined {
    return this.entitiesMap.get(id);
  }

  getSupportedFeatures(entity: Entity): string[] {
    const features: string[] = [];
    const supported = entity.attributes['supported_features'] || 0;
    console.log(entity.attributes
        )
    for (const [key, value] of Object.entries(MediaPlayerFeature)) {
      if (typeof value === 'number' && (supported & value) === value) {
        features.push(key);
      }
    }

    return features;
  }

  /** WebSocket-Initialisierung für Live-Updates */
  private initWebSocket() {
    this.ws = new WebSocket(`${this.baseUrl.replace(/^http/, 'ws')}/api/websocket`);

    this.ws.addEventListener('open', () => {
      this.ws?.send(JSON.stringify({ type: 'auth', access_token: this.token }));
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'auth_ok') {
        this.connected = true;
        this.subscribeToStateChanges();
      }

      if (msg.type === 'event' && msg.event?.data?.entity_id) {
        const updated: Entity = msg.event.data.new_state;
        this.entitiesMap.set(updated.entity_id, updated);
        this.entitiesSubject.next([...this.entitiesMap.values()]);
      }

      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)?.(msg.result);
        this.pending.delete(msg.id);
      }
    });

    this.ws.addEventListener('error', (err) => {
      console.error('[HA] WebSocket Error', err);
    });
  }

  /** WebSocket-Abo für Entitäts-Änderungen */
  private subscribeToStateChanges(): void {
    this.send({
      type: 'subscribe_events',
      event_type: 'state_changed'
    });
  }

  getAllMediaplayers(name: string): Subscription {
    return this.entities$.subscribe((entities) => {
      const players = entities.filter(e => e.entity_id.startsWith(name +'.'));
      console.log('Alle MediaPlayer:', players.map(p => p.entity_id));
    });
  }

  /** Message über WebSocket senden */
  private send(msg: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const id = this.msgId++;
    msg.id = id;
    this.ws.send(JSON.stringify(msg));
  }
}
