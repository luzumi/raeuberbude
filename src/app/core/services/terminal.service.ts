import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {lastValueFrom} from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable( { providedIn: 'root' } )
export class TerminalService {
  private readonly apiUrl: string;

  constructor(private readonly http: HttpClient) {
    // Use configured backend API base URL
    // If the configured backend host is localhost, and the app runs in a browser on a
    // different machine (e.g. mobile at 192.168.x.x), substitute the hostname so the
    // client calls the backend on the same LAN host. This avoids 'localhost' resolving
    // to the device itself on mobile devices.
    let base = environment.backendApiUrl || '';
    try {
      if (typeof window !== 'undefined' && base) {
        const parsed = new URL(base);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          // keep original port
          parsed.hostname = window.location.hostname;
          base = parsed.origin; // protocol + host
        }
      }
    } catch (e) {
      // ignore and fallback to configured value
    }
    this.apiUrl = `${base}/api/speech`;
  }

  async ensureTerminal(partial?: { name?: string; type?: string; location?: string; metadata?: any }): Promise<any> {
    // WICHTIG: Nur registrieren, wenn bereits ein Terminal-Cookie existiert (sonst KEINE Auto-Registrierung)
    try {
      const mine = await this.getMyTerminal();
      if ( !mine?.success || !mine?.data ) {
        return null; // Kein Cookie -> Benutzer soll manuell zuweisen/erstellen
      }
    } catch( e ) {
      // Absichtlicher Silent-Fail: keine Auto-Registrierung ohne Cookie
      console.debug( 'TerminalService.ensureTerminal: no terminal cookie present or check failed', e );
    }

    const payload = {
      name: partial?.name ?? `Browser - ${ this.getDeviceType() }`,
      type: partial?.type ?? 'browser',
      capabilities: {
        hasMicrophone: await this.checkMicrophoneCapability(),
        hasCamera: await this.checkCameraCapability(),
        hasSpeaker: true,
        hasDisplay: true,
        supportsSpeechRecognition: !!((globalThis as any).webkitSpeechRecognition || (globalThis as any).SpeechRecognition),
      },
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${ globalThis.screen.width }x${ globalThis.screen.height }`,
        ...(partial?.metadata),
      },
      ...(partial?.location ? { location: partial.location } : {}),
    };

    try {
      return await lastValueFrom(
        this.http.post( `${ this.apiUrl }/terminals/register`, payload, { withCredentials: true } )
      );
    } catch( e ) {
      // Logging bewusst minimal halten, App-Start nicht blockieren
      console.warn( 'TerminalService.ensureTerminal failed', e );
      return null;
    }
  }

  async getMyTerminal(): Promise<any> {
    try {
      const res = await lastValueFrom(
        this.http.get( `${ this.apiUrl }/terminals/me`, { withCredentials: true } )
      );

      // If server reports no cookie/terminal, attempt localStorage fallback
      if ( res && (res as any).success === false && !(res as any).data ) {
        const fallback = this.getTerminalFallback();
        if ( fallback ) {
          return { success: true, data: fallback, message: 'Terminal from client fallback' };
        }
      }

      return res;
    } catch( e ) {
      // Logging bewusst minimal halten, App-Start nicht blockieren
      console.warn( 'TerminalService.getMyTerminal failed', e );

      // Try fallback before returning failure
      const fallback = this.getTerminalFallback();
      if ( fallback ) return { success: true, data: fallback, message: 'Terminal from client fallback (error path)' };

      return { success: false, data: null };
    }
  }

  async claimTerminal(terminalId: string): Promise<any> {
    const res = await lastValueFrom(
      this.http.post( `${ this.apiUrl }/terminals/claim`, { terminalId }, { withCredentials: true } )
    );

    // Store fallback terminal id locally (non-sensitive) so UI can continue if cookie is not set
    try {
      const idToStore = (res && (res as any).data && (res as any).data.terminalId) || terminalId;
      localStorage.setItem('rb_terminal_id_fallback', idToStore);
    } catch { /* ignore */ }

    return res;
  }

  async unclaimTerminal(): Promise<any> {
    try {
      const res = await lastValueFrom(
        this.http.post( `${ this.apiUrl }/terminals/unclaim`, {}, { withCredentials: true } )
      );
      // Clientseitig als Fallback Cookie entfernen (nicht kritisch, da httpOnly)
      this.clearTerminalCookieFallback();
      return res;
    } catch( e ) {
      this.clearTerminalCookieFallback();
      throw e;
    }
  }

  private clearTerminalCookieFallback() {
    try {
      // httpOnly-Cookie kann nicht direkt gelöscht werden, aber wir können ein leeres setzen
      document.cookie = 'rb_terminal_id=; Max-Age=0; path=/';
    } catch { /* ignore */ }
  }

  async listTerminals(params?: { type?: string; status?: string }): Promise<any> {
    const qs = new URLSearchParams();
    if ( params?.type ) qs.append( 'type', params.type );
    if ( params?.status ) qs.append( 'status', params.status );
    return await lastValueFrom(
      this.http.get( `${ this.apiUrl }/terminals${ qs.toString() ? '?' + qs.toString() : '' }`, { withCredentials: true } )
    );
  }

  async createTerminal(terminalId: string, type: string, location?: string, name?: string): Promise<any> {
    const computedName = name ?? `Browser - ${ this.getDeviceType() }`;
    const payload = {
      terminalId,
      name: computedName,
      type,
      ...(location ? { location } : {}),
      capabilities: {
        hasMicrophone: await this.checkMicrophoneCapability(),
        hasCamera: await this.checkCameraCapability(),
        hasSpeaker: true,
        hasDisplay: true,
        supportsSpeechRecognition: !!((globalThis as any).webkitSpeechRecognition || (globalThis as any).SpeechRecognition),
      },
    };
    return await lastValueFrom(
      this.http.post( `${ this.apiUrl }/terminals`, payload, { withCredentials: true } )
    );
  }

  private getTerminalFallback(): any | null {
    try {
      const id = localStorage.getItem('rb_terminal_id_fallback');
      if ( !id ) return null;
      // Minimal terminal shape expected by UI
      return { terminalId: id, name: `Client-Fallback (${id})`, type: 'browser', capabilities: { hasMicrophone: true } };
    } catch { return null; }
  }

  private getDeviceType(): string {
    const width = globalThis.innerWidth;
    if ( width < 768 ) return 'mobile';
    if ( width < 1024 ) return 'tablet';
    return 'desktop';
  }

  private async checkMicrophoneCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some( (d) => d.kind === 'audioinput' );
    } catch {
      return false;
    }
  }

  private async checkCameraCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some( (d) => d.kind === 'videoinput' );
    } catch {
      return false;
    }
  }
}
