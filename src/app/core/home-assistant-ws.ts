import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

/**
 * Simple WebSocket service for Home Assistant communication.
 * It establishes a connection to the Home Assistant WebSocket API
 * and exposes the incoming messages as an observable stream.
 */
@Injectable({ providedIn: 'root' })
export class HomeAssistantWs {
  private socket$?: WebSocketSubject<any>;

  /** Connect to the Home Assistant WebSocket API if not already connected. */
  connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      const url = environment.homeAssistantUrl.replace(/^http/, 'ws') + '/api/websocket';
      // Automatically send authentication once the socket opens.
      this.socket$ = webSocket({
        url,
        openObserver: {
          next: () => this.socket$?.next({ type: 'auth', access_token: environment.token })
        }
      });
    }
  }

  /** Observable stream of all WebSocket messages. */
  get messages$(): Observable<any> {
    this.connect();
    return this.socket$!;
  }

  /** Send a message through the WebSocket connection. */
  sendMessage(msg: any): void {
    this.connect();
    this.socket$!.next(msg);
  }
}
