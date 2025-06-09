import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaPlayerFeature } from './MediaPlayerFeatures';

/**
 * Struktur eines Home Assistant Entitys.
 * Die Attribute sind optional erweitert.
 */
export interface Entity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    source?: string;
    source_list?: string[];
    volume_level?: number;
    supported_features?: number;
    [key: string]: any;
  };
}

/**
 * Hauptservice für Kommunikation mit Home Assistant.
 * - REST-API: Services aufrufen, Entitäten abrufen
 * - WebSocket: Live-Updates zu Entitätsänderungen
 * - Verwaltung interner Entity-Map mit Reactive-Anbindung
 */
@Injectable({ providedIn: 'root' })
export class HomeAssistant {
  private readonly baseUrl = environment.homeAssistantUrl;
  private readonly token = environment.token;

  // HTTP-Header mit Authentifizierung
  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });

  // WebSocket-Verbindung
  private ws?: WebSocket;
  private msgId = 1;
  private pending = new Map<number, (result: any) => void>();
  private connected = false;

  // Lokale Entitäten-Verwaltung
  private entitiesMap = new Map<string, Entity>();
  private entitiesSubject = new BehaviorSubject<Entity[]>([]);
  public readonly entities$ = this.entitiesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initWebSocket();     // Live-Updates aktivieren
    this.refreshEntities();   // Initiales Laden der Entitäten
  }

  /**
   * Holt alle aktuellen Entitäten über REST-API.
   * (Einmaliger Abruf bei Start)
   */
  public refreshEntities(): void {
    this.http.get<Entity[]>(`${this.baseUrl}/api/states`, { headers: this.headers })
      .subscribe((entities) => {
        this.entitiesMap.clear();
        for (const e of entities) {
          this.entitiesMap.set(e.entity_id, e);
        }
        this.entitiesSubject.next(entities);  // Notify Observer
      });
  }

  /**
   * Führt einen beliebigen Service-Aufruf in Home Assistant aus.
   * z.B. domain: "light", service: "turn_on", data: { entity_id: "light.xyz" }
   */
  public callService(domain: string, service: string, data: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/services/${domain}/${service}`,
      data,
      { headers: this.headers }
    );
  }


  /**
   * Extrahiert unterstützte Features eines Media Players anhand der Bitmaske.
   */
  public getSupportedMediaPlayerFeatures(entityId: string): string[] {
    const entity = this.entitiesMap.get(entityId);
    if (!entity) return [];

    const supported = entity.attributes?.['supported_features'] ?? 0;

    return Object.entries(MediaPlayerFeature)
      .filter(([key, bit]) => typeof bit === 'number' && (supported & bit) !== 0)
      .map(([key]) => key);
  }

  /**
   * Liefert ein einzelnes Entity synchron (aus Cache).
   */
  public getEntity(id: string): Entity | undefined {
    return this.entitiesMap.get(id);
  }

  /**
   * Gibt den aktuellen Stand aller geladenen Entitäten zurück (Snapshot).
   */
  public getEntitiesSnapshot(): Entity[] {
    return this.entitiesSubject.getValue();
  }

  /**
   * Alternative: Liefert unterstützte Features (als Enum-Namen) für eine Entity-ID.
   */
  public getSupportedFeaturesBits(entityId: string): string[] {
    const entity = this.entitiesMap.get(entityId);
    const supported = entity?.attributes?.['supported_features'] ?? 0;
    return Object.keys(MediaPlayerFeature)
      .filter(key => {
        const bit = (MediaPlayerFeature as any)[key];
        return typeof bit === 'number' && (supported & bit) === bit;
      });
  }

  /**
   * Direkt mit Entity-Objekt verwendbar. Liefert Feature-Namen.
   */
  public getSupportedFeatures(entity: Entity): string[] {
    const features: string[] = [];
    const supported = entity.attributes['supported_features'] || 0;
    for (const [key, value] of Object.entries(MediaPlayerFeature)) {
      if (typeof value === 'number' && (supported & value) === value) {
        features.push(key);
      }
    }
    return features;
  }

  /**
   * Initialisiert die WebSocket-Verbindung für Echtzeitänderungen.
   */
  private initWebSocket() {
    this.ws = new WebSocket(`${this.baseUrl.replace(/^http/, 'ws')}/api/websocket`);

    this.ws.addEventListener('open', () => {
      this.ws?.send(JSON.stringify({ type: 'auth', access_token: this.token }));
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);

      // Authentifizierung erfolgreich → Ereignisse abonnieren
      if (msg.type === 'auth_ok') {
        this.connected = true;
        this.subscribeToStateChanges();
      }

      // Wenn sich Zustand eines Entities ändert
      if (msg.type === 'event' && msg.event?.data?.entity_id) {
        const updated: Entity = msg.event.data.new_state;
        this.entitiesMap.set(updated.entity_id, updated);
        this.entitiesSubject.next([...this.entitiesMap.values()]);
      }

      // Antwort auf Anfrage verarbeiten
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)?.(msg.result);
        this.pending.delete(msg.id);
      }
    });

    this.ws.addEventListener('error', (err) => {
      console.error('[HA] WebSocket Error', err);
    });
  }

  /**
   * Abonniert State-Änderungen für alle Entities.
   */
  private subscribeToStateChanges(): void {
    this.send({
      type: 'subscribe_events',
      event_type: 'state_changed'
    });
  }

  /**
   * Beispiel: Gibt alle MediaPlayer mit bestimmtem Prefix aus.
   */
  public getAllMediaplayers(name: string): Subscription {
    return this.entities$.subscribe((entities) => {
      const players = entities.filter(e => e.entity_id.startsWith(name + '.'));
      console.log('Alle MediaPlayer:', players.map(p => p.entity_id));
    });
  }

  /**
   * Sendet generische WebSocket-Nachricht (z.B. für manuelle Events).
   */
  private send(msg: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const id = this.msgId++;
    msg.id = id;
    this.ws.send(JSON.stringify(msg));
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


}
