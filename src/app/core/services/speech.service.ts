import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, lastValueFrom } from 'rxjs';

// Web Speech API interfaces
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface HumanInputData {
  userId: string;
  terminalId?: string;
  inputText: string;
  inputType: 'speech' | 'text' | 'gesture';
  context?: {
    location?: string;
    device?: string;
    browser?: string;
    sessionId?: string;
    confidence?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any = null;
  private isRecordingSubject = new BehaviorSubject<boolean>(false);
  private lastInputSubject = new BehaviorSubject<string>('');
  private transcriptSubject = new Subject<SpeechRecognitionResult>();
  private apiUrl = `/api/speech`;
  private sessionId: string;
  private terminalId: string;

  isRecording$ = this.isRecordingSubject.asObservable();
  lastInput$ = this.lastInputSubject.asObservable();
  transcript$ = this.transcriptSubject.asObservable();

  constructor(private http: HttpClient) {
    this.sessionId = this.generateSessionId();
    this.terminalId = this.getOrCreateTerminalId();
    this.initializeSpeechRecognition();
    this.registerTerminal();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = 'de-DE'; // German language

    // Configure event handlers
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0.9;
      
      const speechResult: SpeechRecognitionResult = {
        transcript,
        confidence,
        isFinal: result.isFinal
      };

      this.transcriptSubject.next(speechResult);

      if (result.isFinal) {
        this.lastInputSubject.next(transcript);
        this.saveToDatabase(transcript, confidence);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
      this.stopRecording();
    };

    this.recognition.onend = () => {
      this.isRecordingSubject.next(false);
    };

    this.recognition.onspeechend = () => {
      this.stopRecording();
    };
  }

  async startRecording(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Spracherkennung wird in diesem Browser nicht unterstützt');
    }

    if (this.isRecordingSubject.value) {
      return; // Already recording
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.isRecordingSubject.next(true);
      this.recognition.start();
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (this.isRecordingSubject.value) {
          this.stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Mikrofon-Zugriff verweigert oder nicht verfügbar');
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.recognition || !this.isRecordingSubject.value) {
      return;
    }

    try {
      this.recognition.stop();
      this.isRecordingSubject.next(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecordingSubject.next(false);
    }
  }

  private async saveToDatabase(transcript: string, confidence: number): Promise<void> {
    const userId = this.getCurrentUserId();
    
    if (!userId) {
      console.error('No user ID available');
      return;
    }

    const inputData: HumanInputData = {
      userId,
      terminalId: this.terminalId,
      inputText: transcript,
      inputType: 'speech',
      context: {
        location: window.location.pathname,
        device: this.getDeviceType(),
        browser: navigator.userAgent.substring(0, 100),
        sessionId: this.sessionId,
        confidence
      }
    };

    try {
      await lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData));
      console.log('Speech input saved successfully');
    } catch (error) {
      console.error('Failed to save speech input:', error);
    }
  }

  private async registerTerminal(): Promise<void> {
    const terminalData = {
      terminalId: this.terminalId,
      name: `Browser - ${this.getDeviceType()}`,
      type: 'browser',
      capabilities: {
        hasMicrophone: await this.checkMicrophoneCapability(),
        hasCamera: await this.checkCameraCapability(),
        hasSpeaker: true,
        hasDisplay: true,
        supportsSpeechRecognition: !!this.recognition
      },
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`
      }
    };

    try {
      await lastValueFrom(this.http.post(`${this.apiUrl}/terminals/register`, terminalData));
      console.log('Terminal registered successfully');
    } catch (error) {
      console.error('Failed to register terminal:', error);
    }
  }

  private handleRecognitionError(error: string): void {
    let userMessage = 'Spracherkennung fehlgeschlagen';
    
    switch (error) {
      case 'no-speech':
        userMessage = 'Keine Sprache erkannt. Bitte deutlich sprechen.';
        break;
      case 'audio-capture':
        userMessage = 'Mikrofon nicht verfügbar';
        break;
      case 'not-allowed':
        userMessage = 'Mikrofon-Zugriff verweigert';
        break;
      case 'network':
        userMessage = 'Netzwerkfehler bei der Spracherkennung';
        break;
    }

    this.lastInputSubject.next(userMessage);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOrCreateTerminalId(): string {
    const storedId = localStorage.getItem('terminal-id');
    if (storedId) {
      return storedId;
    }

    const newId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('terminal-id', newId);
    return newId;
  }

  private getCurrentUserId(): string {
    // Get user ID from auth service or session storage
    const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '{}');
    return user._id || user.id || 'anonymous';
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private async checkMicrophoneCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  private async checkCameraCapability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  // Public methods for manual text input
  async submitTextInput(text: string): Promise<void> {
    const userId = this.getCurrentUserId();
    
    if (!userId) {
      throw new Error('No user ID available');
    }

    const inputData: HumanInputData = {
      userId,
      terminalId: this.terminalId,
      inputText: text,
      inputType: 'text',
      context: {
        location: window.location.pathname,
        device: this.getDeviceType(),
        browser: navigator.userAgent.substring(0, 100),
        sessionId: this.sessionId
      }
    };

    try {
      await lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData));
      this.lastInputSubject.next(text);
    } catch (error) {
      console.error('Failed to save text input:', error);
      throw error;
    }
  }

  // Get recent inputs for current user
  getRecentInputs(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/inputs/user/${userId}?limit=10`);
  }

  // Get all inputs with optional filters
  getAllInputs(filters?: any): Observable<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/inputs?${params.toString()}`);
  }

  // Clear last input display
  clearLastInput(): void {
    this.lastInputSubject.next('');
  }
}
