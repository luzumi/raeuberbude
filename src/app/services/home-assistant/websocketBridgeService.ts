import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {environment} from '../../../environments/environments';

interface WebSocketMessage {
  id: number;
  type: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketBridgeService {
  private ws?: WebSocket;
  private connected = false;
  private msgId = 1;
  private pending = new Map<number, (response: any) => void>();
  private eventSubjects = new Map<string, Subject<any>>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(`${environment.homeAssistantUrl.replace(/^http/, 'ws')}/api/websocket`);

    this.ws.addEventListener('open', () => {
      this.ws?.send(JSON.stringify({ type: 'auth', access_token: environment.token }));
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'auth_ok') {
        this.connected = true;
        console.log('[WS] Auth OK – subscribing events now');
      }

      if (msg.type === 'result' && this.pending.has(msg.id)) {
        const resolve = this.pending.get(msg.id);
        resolve?.(msg);
        this.pending.delete(msg.id);
      }

      if (msg.type === 'event') {
        const subject = this.eventSubjects.get(msg.event.event_type);
        subject?.next(msg.event);
      }
    });

    this.ws.addEventListener('close', () => {
      this.connected = false;
      console.warn('WebSocketBridge: connection closed, retrying in 5s...');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.addEventListener('error', err => {
      console.error('WebSocketBridge error:', err);
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public send(msg: Omit<WebSocketMessage, 'id'>): Promise<any> {
    const id = this.msgId++;
    const fullMsg = { ...msg, id };
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject('WebSocket not connected');
        return;
      }
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify(fullMsg));
    });
  }

  public subscribeEvent(eventType: string): Subject<any> {
    if (!this.eventSubjects.has(eventType)) {
      this.eventSubjects.set(eventType, new Subject<any>());
      this.send({ type: 'subscribe_events', event_type: eventType }).catch(console.error);
    }
    return this.eventSubjects.get(eventType)!;
  }
}
