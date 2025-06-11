import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Entity } from './home-assistant.service';

export enum MediaPlayerFeature {
  TURN_ON = 128,
  TURN_OFF = 256,
  VOLUME_MUTE = 8,
  VOLUME_SET = 4,
  VOLUME_STEP = 1024,
  SELECT_SOURCE = 2048,
  PLAY = 16384,
  PAUSE = 1,
  STOP = 4096,
  NEXT_TRACK = 32,
  PREVIOUS_TRACK = 16,
  PLAY_MEDIA = 512,
  REPEAT_SET = 262144,
  SHUFFLE_SET = 131072,
  SELECT_SOUND_MODE = 65536,
  BROWSE_MEDIA = 32768,
  CLEAR_PLAYLIST = 8192,
  GROUPING = 524288,
  MEDIA_ANNOUNCE = 2097152,
  MEDIA_SEEK = 2
}

@Injectable({ providedIn: 'root' })
export class HomeAssistantInspector {
  private readonly baseUrl = environment.homeAssistantUrl;
  private readonly token = environment.token;
  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  public getAllEntities(): Observable<Entity[]> {
    return this.http.get<Entity[]>(`${this.baseUrl}/api/states`, { headers: this.headers });
  }

  public getEntity(id: string): Observable<Entity> {
    return this.http.get<Entity>(`${this.baseUrl}/api/states/${id}`, { headers: this.headers });
  }

  public getSupportedFeatures(entity: Entity): string[] {
    const supported = entity.attributes.supported_features || 0;
    return Object.entries(MediaPlayerFeature)
      .filter(([_, bit]) => (supported & Number(bit)) === Number(bit))
      .map(([name]) => name);
  }

  public describeFeatures(bitmask: number): string[] {
    return Object.entries(MediaPlayerFeature)
      .filter(([_, value]) => typeof value === 'number' && (bitmask & value) === value)
      .map(([name]) => name);
  }

  public listAllMediaControls(entities: Entity[]): { entity_id: string, features: string[] }[] {
    return entities
      .filter(e => e.entity_id.startsWith('media_player.'))
      .map(e => ({
        entity_id: e.entity_id,
        features: this.getSupportedFeatures(e)
      }));
  }
}
