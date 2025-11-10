import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private apiUrl: string;

  constructor(private readonly http: HttpClient) {
    const host = globalThis?.location?.hostname || 'localhost';
    const port = 3001; // Standard aus Nest (.env NEST_PORT)
    this.apiUrl = `http://${host}:${port}/api/speech`;
  }

  async ensureTerminal(partial?: { name?: string; type?: string; location?: string; metadata?: any }): Promise<any> {
    // WICHTIG: Nur registrieren, wenn bereits ein Terminal-Cookie existiert (sonst KEINE Auto-Registrierung)
    try {
      const mine = await this.getMyTerminal();
      if (!mine?.success || !mine?.data) {
        return null; // Kein Cookie -> Benutzer soll manuell zuweisen/erstellen
      }
    } catch { /* ignore */ }

    const payload: any = {
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
        ...(partial?.metadata ?? {}),
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
      return await lastValueFrom(
        this.http.get(`${this.apiUrl}/terminals/me`, { withCredentials: true })
      );
    } catch (e) {
      return { success: false, data: null };
    }
  }

  async claimTerminal(terminalId: string): Promise<any> {
    return await lastValueFrom(
      this.http.post(`${this.apiUrl}/terminals/claim`, { terminalId }, { withCredentials: true })
    );
  }

  async unclaimTerminal(): Promise<any> {
    try {
      const res = await lastValueFrom(
        this.http.post(`${this.apiUrl}/terminals/unclaim`, {}, { withCredentials: true })
      );
      // Clientseitig als Fallback Cookie entfernen (nicht kritisch, da httpOnly)
      this.clearTerminalCookieFallback();
      return res;
    } catch (e) {
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
    if (params?.type) qs.append('type', params.type);
    if (params?.status) qs.append('status', params.status);
    return await lastValueFrom(
      this.http.get(`${this.apiUrl}/terminals${qs.toString() ? '?' + qs.toString() : ''}`, { withCredentials: true })
    );
  }

  async createTerminal(terminalId: string, type: string, location?: string, name?: string): Promise<any> {
    const computedName = name ?? `Browser - ${this.getDeviceType()}`;
    const payload: any = {
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
      this.http.post(`${this.apiUrl}/terminals`, payload, { withCredentials: true })
    );
  }

  private getDeviceType(): string {
    const width = globalThis.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private async checkMicrophoneCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  private async checkCameraCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.kind === 'videoinput');
    } catch {
      return false;
    }
  }
}
