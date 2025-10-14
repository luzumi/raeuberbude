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
  private readonly pending = new Map<number, { resolve: (response: any) => void; request: WebSocketMessage }>();
  private readonly eventSubjects = new Map<string, Subject<any>>();
  // Queue messages that are sent before the socket is authenticated
  private readonly queue: { msg: WebSocketMessage; resolve: (v: any) => void; reject: (e: any) => void }[] = [];

  constructor() {
    this.connect();
  }

  private connect(): void {
    // Ermittelt die Basis-URL für den WebSocket: Bei relativer API-URL
    // ("/api") wird der aktuelle Origin genutzt, damit auch externe
    // Geräte über den Dev-Server verbunden werden.
    const base = environment.homeAssistantUrl.startsWith('http')
      ? environment.homeAssistantUrl.replace(/^http/, 'ws')
      : window.location.origin.replace(/^http/, 'ws') + environment.homeAssistantUrl;

    this.ws = new WebSocket(`${base}/websocket`);

    this.ws.addEventListener('open', () => {
      this.ws?.send(JSON.stringify({ type: 'auth', access_token: environment.token }));
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'auth_ok') {
        this.connected = true;
        console.log('[WS] Auth OK – subscribing events now');

        // Flush queued messages once the connection is fully established
        this.queue.splice(0).forEach(({ msg: queuedMsg, resolve }) => {
          this.pending.set(queuedMsg.id, { resolve, request: queuedMsg });
          console.debug('[WS->] (flush)', queuedMsg);
          this.ws!.send(JSON.stringify(queuedMsg));
        });
      }

      if (msg.type === 'result' && this.pending.has(msg.id)) {
        const entry = this.pending.get(msg.id)!;
        // Debug summary for common calls
        try {
          const reqType = entry.request.type;
          if (reqType === 'get_states') {
            const count = Array.isArray(msg.result) ? msg.result.length : 0;
            console.debug('[WS<-] get_states result:', count, 'entities');
          } else if (reqType === 'config/entity_registry/list') {
            const count = Array.isArray(msg.result) ? msg.result.length : 0;
            console.debug('[WS<-] entity_registry/list result:', count, 'entries');
          } else {
            console.debug('[WS<-] result for', reqType, 'id=', msg.id);
          }
        } catch {}
        entry.resolve(msg);
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

  public send(msg: Omit<WebSocketMessage, "id">): Promise<any> {
    const id = this.msgId++;
    const fullMsg = { ...msg, id } as WebSocketMessage;
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        // Store message until the connection is ready.
        this.queue.push({ msg: fullMsg, resolve, reject });
        return;
      }
      this.pending.set(id, { resolve, request: fullMsg });
      console.debug('[WS->]', fullMsg);
      this.ws.send(JSON.stringify(fullMsg));
    });
  }

  public subscribeEvent(eventType: string): Subject<any> {
    if (!this.eventSubjects.has(eventType)) {
      this.eventSubjects.set(eventType, new Subject<any>());
      this.send( { type: 'subscribe_events', event_type: eventType } ).catch(console.error);
    }
    return this.eventSubjects.get(eventType)!;
  }
}
