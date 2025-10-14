import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {environment} from '../../../environments/environments';

interface WebSocketMessage {
  id: number;
  type: string;
  [key: string]: any;
}

export interface WsLogEntry {
  time: string;           // formatted time with milliseconds
  dir: '->' | '<-' | 'open' | 'close' | 'error' | 'auth' | 'queue';
  type?: string;          // HA WS message type
  id?: number;            // message id when present
  summary?: string;       // short textual hint (e.g., domain.service)
  payload?: any;          // full parsed JSON payload
  rawLen?: number;        // string length of the raw JSON (in chars)
  ts?: number;            // epoch milliseconds for precise deltas
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

  // Structured log stream for UI viewers
  private readonly logSubject = new Subject<WsLogEntry>();
  public readonly logs$ = this.logSubject.asObservable();
  private readonly lastLogs: WsLogEntry[] = [];

  constructor() {
    this.connect();
  }

  private nowWithMs(): string {
    const d = new Date();
    const base = d.toLocaleTimeString(undefined, { hour12: false });
    return `${base}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  }

  private connect(): void {
    /**
     * Ermittelt die Basis-URL für den WebSocket: Bei relativer API-URL
     * ('/api') wird der aktuelle Origin genutzt, damit auch externe
     * Geräte über den Dev-Server verbunden werden.
     */
    const base = environment.homeAssistantUrl.startsWith('http')
      ? environment.homeAssistantUrl.replace(/^http/, 'ws')
      : globalThis.location.origin.replace(/^http/, 'ws') + environment.homeAssistantUrl;

    this.ws = new WebSocket(`${base}/websocket`);
    this.emitLog({ dir: 'open', summary: `connecting to ${base}/websocket`, time: this.nowWithMs() });

    this.ws.addEventListener('open', () => {
      this.ws?.send(JSON.stringify({ type: 'auth', access_token: environment.token }));
    });

    this.ws.addEventListener('message', (event) => {
      const raw = event.data as string;
      const msg = JSON.parse(raw);
      // Generic full log for every incoming message
      let summary: any;
      if ( msg.success ) {
        summary = msg.type === 'result'
          ? 'result ok'
          : msg.type;
      } else {
        summary = msg.type === 'result'
          ? 'result error'
          : msg.type;
      }
      this.emitLog({
        dir: '<-',
        id: typeof msg.id === 'number' ? msg.id : undefined,
        type: msg.type,
        summary,
        payload: msg,
        rawLen: raw.length,
        time: this.nowWithMs()
      });

      if (msg.type === 'auth_ok') {
        this.connected = this.isConnected();
        console.log('[WS] Auth OK – subscribing events now');

        // Flush queued messages once the connection is fully established
        for ( const { msg: queuedMsg, resolve } of this.queue.splice( 0 ) ) {
          this.pending.set(queuedMsg.id, { resolve, request: queuedMsg });
          console.debug('[WS->] (flush)', queuedMsg);
          const rawFlush = JSON.stringify(queuedMsg);
          this.emitLog({ dir: '->', id: queuedMsg.id, type: queuedMsg.type, summary: '(flush)', payload: queuedMsg, rawLen: rawFlush.length, time: this.nowWithMs() });
          this.ws!.send(rawFlush);
        }
      }

      if (msg.type === 'result' && this.pending.has(msg.id)) {
        const entry = this.pending.get(msg.id)!;
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
      this.emitLog({ dir: 'close', summary: 'connection closed, retry in 5s', time: this.nowWithMs() });
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.addEventListener('error', err => {
      console.error('WebSocketBridge error:', err);
      this.emitLog({ dir: 'error', summary: JSON.stringify(err), payload: err, time: this.nowWithMs() });
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
        const summary = msg['type'] === 'call_service' && (msg as any).domain && (msg as any).service
          ? `${(msg as any).domain}.${(msg as any).service}` : 'queued until auth';
        this.emitLog({ dir: 'queue', id, type: msg['type'], summary, payload: fullMsg, rawLen: JSON.stringify(fullMsg).length, time: this.nowWithMs() });
        return;
      }
      this.pending.set(id, { resolve, request: fullMsg });
      console.debug('[WS->]', fullMsg);
      const raw = JSON.stringify(fullMsg);
      const summary = msg['type'] === 'call_service' && (msg as any).domain && (msg as any).service
        ? `${(msg as any).domain}.${(msg as any).service}` : undefined;
      this.emitLog({ dir: '->', id, type: msg['type'], summary, payload: fullMsg, rawLen: raw.length, time: this.nowWithMs() });
      this.ws.send(raw);
    });
  }

  public subscribeEvent(eventType: string): Subject<any> {
    if (!this.eventSubjects.has(eventType)) {
      this.eventSubjects.set(eventType, new Subject<any>());
      this.send( { type: 'subscribe_events', event_type: eventType } ).catch(console.error);
    }
    return this.eventSubjects.get(eventType)!;
  }

  public getLogsSnapshot(): WsLogEntry[] {
    return [...this.lastLogs];
  }

  public clearLogs(): void {
    this.lastLogs.length = 0;
  }

  private emitLog(entry: WsLogEntry) {
    entry.time = this.nowWithMs();
    entry.ts = Date.now();
    const withTime: WsLogEntry = entry;
    this.lastLogs.unshift(withTime);
    if (this.lastLogs.length > 300) this.lastLogs.pop();
    this.logSubject.next(withTime);
  }
}
