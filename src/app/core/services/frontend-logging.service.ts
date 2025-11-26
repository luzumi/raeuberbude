import { Injectable } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface FrontendLogEntry {
  ts: string;
  level: LogLevel;
  tag?: string;
  message: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class FrontendLoggingService {
  private readonly maxStored = 1000;
  private logs: FrontendLogEntry[] = [];

  constructor() {
    // Make available for quick inspection in browser console during development
    try {
      (window as any).__FRONTEND_LOGGER = this;
    } catch (e) {
      // ignore in non-browser environments
    }
  }

  private push(level: LogLevel, tag: string | undefined, message: string, data?: any) {
    const entry: FrontendLogEntry = {
      ts: new Date().toISOString(),
      level,
      tag,
      message,
      data
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxStored) this.logs.shift();

    // Mirror to console for immediate visibility
    const prefix = `[${entry.ts}]${tag ? ' [' + tag + ']' : ''}`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }
  }

  debug(tag: string | undefined, message: string, data?: any) { this.push('debug', tag, message, data); }
  info(tag: string | undefined, message: string, data?: any) { this.push('info', tag, message, data); }
  warn(tag: string | undefined, message: string, data?: any) { this.push('warn', tag, message, data); }
  error(tag: string | undefined, message: string, data?: any) { this.push('error', tag, message, data); }

  list(): FrontendLogEntry[] { return [...this.logs]; }

  clear(): void { this.logs = []; }

  download(filename = 'frontend-logs.json'): void {
    try {
      const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download logs', e);
    }
  }
}
