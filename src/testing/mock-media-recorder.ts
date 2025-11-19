/**
 * MockMediaRecorder für Unit-Tests
 * Simuliert MediaRecorder API mit kontrollierbaren Events
 */

interface MediaRecorderErrorEvent extends Event {
  error: DOMException;
}

export class MockMediaRecorder implements Partial<MediaRecorder> {
  state: RecordingState = 'inactive';
  mimeType: string = 'audio/webm;codecs=opus';
  stream: MediaStream;

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onerror: ((event: MediaRecorderErrorEvent) => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;

  private chunks: Blob[] = [];
  private startTime = 0;

  constructor(stream?: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream || createMockMediaStream();
    if (options?.mimeType) {
      this.mimeType = options.mimeType;
    }
  }

  start(timeslice?: number): void {
    if (this.state !== 'inactive') {
      throw new DOMException('InvalidStateError: The MediaRecorder is not in the inactive state.');
    }

    this.state = 'recording';
    this.startTime = Date.now();
    this.chunks = [];

    if (this.onstart) {
      this.onstart();
    }
  }

  stop(): void {
    if (this.state === 'inactive') {
      throw new DOMException('InvalidStateError: The MediaRecorder is in the inactive state.');
    }

    this.state = 'inactive';

    // Emit dataavailable asynchronously in tests only if no chunks were recorded
    try {
      if (this.chunks.length === 0) {
        const smallBlob = new Blob([new Uint8Array([0,1,2])], { type: this.mimeType });
        if (this.ondataavailable) {
          // use setTimeout 0 to schedule in macrotask queue
          setTimeout(() => {
            try {
              const ev = new BlobEvent('dataavailable', { data: smallBlob });
              this.ondataavailable && this.ondataavailable(ev);
            } catch (e) {
              // ignore
            }
          }, 0);
        }
      }
    } catch (e) {
      // ignore
    }

    // Do NOT call onstop here - keep triggerStop() responsible for firing onstop to avoid duplicates
  }

  pause(): void {
    if (this.state !== 'recording') {
      throw new DOMException('InvalidStateError');
    }
    this.state = 'paused';
    if (this.onpause) {
      this.onpause();
    }
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new DOMException('InvalidStateError');
    }
    this.state = 'recording';
    if (this.onresume) {
      this.onresume();
    }
  }

  requestData(): void {
    // Implementierung falls benötigt
  }

  addEventListener(type: string, listener: EventListener): void {
    // Einfache Implementierung für Tests
    if (type === 'dataavailable') {
      this.ondataavailable = listener as any;
    } else if (type === 'stop') {
      this.onstop = listener as any;
    } else if (type === 'start') {
      this.onstart = listener as any;
    } else if (type === 'error') {
      this.onerror = listener as any;
    }
  }

  removeEventListener(): void {
    // Stub
  }

  dispatchEvent(): boolean {
    return true;
  }

  // Test-Hilfsmethoden zum Triggern von Events

  triggerDataAvailable(blob: Blob): void {
    this.chunks.push(blob);
    if (this.ondataavailable) {
      const event = new BlobEvent('dataavailable', { data: blob });
      // schedule in macrotask queue to avoid racing with TestBed teardown
      setTimeout(() => {
        try { this.ondataavailable && this.ondataavailable(event); } catch (e) { /* swallow */ }
      }, 0);
    }
  }

  triggerStop(): void {
    this.state = 'inactive';
    // Call onstop asynchronously to mirror native MediaRecorder timing
    if (this.onstop) {
      setTimeout(() => {
        try { this.onstop && this.onstop(); } catch (e) { /* swallow errors in test mock */ }
      }, 0);
    }
  }

  triggerError(errorName: string = 'UnknownError', message: string = 'Recording error'): void {
    if (this.onerror) {
      const error = new Error(message);
      error.name = errorName;
      const event = { error } as MediaRecorderErrorEvent;
      // schedule async
      setTimeout(() => {
        try { this.onerror && this.onerror(event); } catch (e) { /* swallow */ }
      }, 0);
    }
  }

  getRecordedChunks(): Blob[] {
    return [...this.chunks];
  }

  getRecordingDuration(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }

  // Static mock für isTypeSupported
  static isTypeSupported(type: string): boolean {
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    return supportedTypes.includes(type);
  }
}

// Helper: Mock MediaStream erstellen
export function createMockMediaStream(): MediaStream {
  const mockTrack = {
    kind: 'audio',
    id: 'mock-track-id',
    label: 'Mock Audio Track',
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: jasmine.createSpy('stop'),
    addEventListener: jasmine.createSpy('addEventListener'),
    removeEventListener: jasmine.createSpy('removeEventListener'),
    dispatchEvent: jasmine.createSpy('dispatchEvent')
  } as unknown as MediaStreamTrack;

  return {
    id: 'mock-stream-id',
    active: true,
    getTracks: () => [mockTrack],
    getAudioTracks: () => [mockTrack],
    getVideoTracks: () => [],
    getTrackById: () => mockTrack,
    addTrack: jasmine.createSpy('addTrack'),
    removeTrack: jasmine.createSpy('removeTrack'),
    clone: jasmine.createSpy('clone'),
    addEventListener: jasmine.createSpy('addEventListener'),
    removeEventListener: jasmine.createSpy('removeEventListener'),
    dispatchEvent: jasmine.createSpy('dispatchEvent')
  } as unknown as MediaStream;
}

// BlobEvent falls nicht verfügbar
export class BlobEvent extends Event {
  readonly data: Blob;
  readonly timecode: DOMHighResTimeStamp;

  constructor(type: string, eventInitDict?: { data: Blob; timecode?: DOMHighResTimeStamp }) {
    super(type);
    this.data = eventInitDict?.data || new Blob();
    this.timecode = eventInitDict?.timecode || 0;
  }
}
