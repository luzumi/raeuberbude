import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface RecordingOptions {
  maxDurationMs?: number;
  language?: string;
}

export interface RecordingResult {
  audioBlob: Blob;
  mimeType: string;
  durationMs: number;
}

/**
 * Verantwortlich für Audio-Aufnahme via MediaRecorder
 * Keine STT-Logik, nur Recording
 */
@Injectable({
  providedIn: 'root'
})
export class SpeechRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimeout: any = null;
  private recordingStartTime = 0;
  private readonly isRecordingSubject = new BehaviorSubject<boolean>(false);
  private lastRecordingResult: RecordingResult | null = null;

  isRecording$ = this.isRecordingSubject.asObservable();

  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecordingSubject.value) {
      throw new Error('Already recording');
    }

    const stream = await this.getMediaStream();
    const mimeType = this.getSupportedMimeType();

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 192000
    });

    this.recordedChunks = [];
    this.recordingStartTime = Date.now();

    this.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.start(1000);
    this.isRecordingSubject.next(true);

    // Auto-stop nach maxDurationMs
    const maxDuration = options.maxDurationMs || 30000;
    this.recordingTimeout = setTimeout(() => {
      if (this.isRecordingSubject.value) {
        this.stopRecording().catch(console.error);
      }
    }, maxDuration);
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.mediaRecorder || !this.isRecordingSubject.value) {
      // If already stopped, return the last result if available
      if (this.lastRecordingResult) {
        const result = this.lastRecordingResult;
        this.lastRecordingResult = null;
        return result;
      }
      throw new Error('Not recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType;

      this.mediaRecorder.onstop = () => {
        const durationMs = Date.now() - this.recordingStartTime;
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });

        const result: RecordingResult = {
          audioBlob,
          mimeType,
          durationMs
        };

        // Store result for potential later retrieval
        this.lastRecordingResult = result;

        this.cleanup();

        resolve(result);
      };

      this.mediaRecorder.onerror = (event: any) => {
        this.cleanup();
        reject(new Error(`Recording failed: ${event.error}`));
      };

      try {
        this.mediaRecorder.stop();
        clearTimeout(this.recordingTimeout);
      } catch (error) {
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Get the last recording result (useful when recording was stopped automatically)
   */
  getLastRecordingResult(): RecordingResult | null {
    const result = this.lastRecordingResult;
    this.lastRecordingResult = null; // Clear after retrieval
    return result;
  }

  private cleanup(): void {
    // Stop all tracks
    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecordingSubject.next(false);
    clearTimeout(this.recordingTimeout);
  }

  private async getMediaStream(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });
    } catch (error: any) {
      // Fallback: Einfache Audio-Constraints
      console.warn('[Recorder] Advanced audio failed, trying simple audio:', error);
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }
}

