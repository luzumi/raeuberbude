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

interface ServerTranscriptionResult {
  success: boolean;
  data?: {
    provider: string;
    transcript: string;
    confidence: number;
    durationMs: number;
    language?: string;
    audioDurationMs?: number;
  };
  error?: string;
  message?: string;
}

type STTMode = 'auto' | 'browser' | 'server';

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

  // Retry-Handling für flüchtige Netzwerkfehler der Web Speech API
  private networkRetryCount = 0;
  private readonly networkMaxRetries = 3;
  private isRetrying = false;
  private SpeechRecognitionCtor: any = null;

  // Server STT Support
  private sttMode: STTMode = 'auto';
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private serverRecordingTimeout: any;
  private isServerRecording = false;
  private maxServerRecordingMs = 30000;

  isRecording$ = this.isRecordingSubject.asObservable();
  lastInput$ = this.lastInputSubject.asObservable();
  transcript$ = this.transcriptSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.sessionId = this.generateSessionId();
    this.terminalId = this.getOrCreateTerminalId();
    this.initializeSpeechRecognition();
    this.registerTerminal();
    
    // Load STT mode preference from local storage
    const savedMode = localStorage.getItem('stt-mode') as STTMode;
    if (savedMode && ['auto', 'browser', 'server'].includes(savedMode)) {
      this.sttMode = savedMode;
    }
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }

    this.SpeechRecognitionCtor = SpeechRecognitionAPI;
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

    this.recognition.onerror = async (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event?.error === 'network') {
        // In auto mode, switch to server STT on network error
        if (this.sttMode === 'auto') {
          console.log('Browser STT network error, switching to server STT');
          this.stopRecording();
          await this.wait(500);
          return this.startServerRecording();
        }
        // Otherwise try to retry
        this.handleNetworkErrorRetry();
        return;
      }
      this.handleRecognitionError(event?.error);
      this.stopRecording();
    };

    this.recognition.onend = () => {
      // Bei aktivem Retry die UI im "Recording"-Zustand lassen
      if (this.isRetrying) {
        return;
      }
      this.isRecordingSubject.next(false);
    };

    this.recognition.onspeechend = () => {
      this.stopRecording();
    };

    this.recognition.onstart = () => {
      // erfolgreiche (Neu-)Initialisierung
      this.isRetrying = false;
    };

    this.recognition.onnomatch = () => {
      // Kein Match – Benutzerhinweis ohne Fehlerzustand
      this.lastInputSubject.next('Keine Sprache erkannt. Bitte erneut versuchen.');
    };
  }

  async startRecording(): Promise<void> {
    if (this.isRecordingSubject.value) {
      return; // Already recording
    }

    // Determine which STT method to use
    const useServerSTT = await this.shouldUseServerSTT();
    
    if (useServerSTT) {
      return this.startServerRecording();
    }

    if (!this.recognition) {
      // Fallback to server STT if browser STT is not available
      return this.startServerRecording();
    }

    try {
      // Secure context check (HTTPS or localhost required for getUserMedia)
      const isSecure = (window.isSecureContext === true) || ['localhost', '127.0.0.1'].includes(location.hostname);
      if (!isSecure) {
        const msg = 'Mikrofon erfordert HTTPS oder localhost. Bitte die App über HTTPS öffnen (z. B. ng serve --ssl) oder localhost verwenden.';
        this.lastInputSubject.next(msg);
        throw new Error('INSECURE_CONTEXT');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        const msg = 'Mikrofon-API nicht verfügbar (mediaDevices.getUserMedia fehlt).';
        this.lastInputSubject.next(msg);
        throw new Error('UNSUPPORTED_MEDIA_DEVICES');
      }

      // Try to preflight permission (not supported in all browsers)
      try {
        const permissions: any = (navigator as any).permissions;
        if (permissions?.query) {
          const status = await permissions.query({ name: 'microphone' as any });
          if (status.state === 'denied') {
            this.lastInputSubject.next('Mikrofon-Zugriff durch Browser blockiert. Bitte in den Website-Berechtigungen erlauben.');
            throw new Error('MIC_DENIED');
          }
        }
      } catch {
        // ignore permission query errors; continue with getUserMedia prompt
      }

      // Request microphone permission (will trigger browser prompt in secure contexts)
      if (!navigator.onLine) {
        const msg = 'Offline: Keine Internetverbindung. Die Web Speech API benötigt eine Online-Verbindung.';
        this.lastInputSubject.next(msg);
        throw new Error('OFFLINE');
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });
      // kleine Stabilisierungspause nach Permission/Device-Open
      await this.wait(350);

      this.isRecordingSubject.next(true);
      // Reset Retry-Zustand beim Start
      this.networkRetryCount = 0;
      this.isRetrying = false;
      this.recognition.start();

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (this.isRecordingSubject.value) {
          this.stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errMsg = (error as any)?.message || '';
      const message = errMsg === 'INSECURE_CONTEXT'
        ? 'Unsicherer Kontext: Bitte die App über HTTPS oder localhost öffnen, damit der Browser das Mikrofon freigibt.'
        : errMsg === 'OFFLINE'
          ? 'Keine Internetverbindung. Bitte Netzwerk prüfen und erneut versuchen.'
          : 'Mikrofon-Zugriff verweigert oder nicht verfügbar';
      this.lastInputSubject.next(message);
      throw new Error(message);
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecordingSubject.value) {
      return;
    }

    // Stop server recording if active
    if (this.isServerRecording) {
      return this.stopServerRecording();
    }

    // Stop browser recording
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.isRecordingSubject.next(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
        this.isRecordingSubject.next(false);
      }
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

  private handleNetworkErrorRetry(): void {
    // Maximal begrenzt neu versuchen
    if (this.networkRetryCount >= this.networkMaxRetries) {
      this.isRetrying = false;
      this.lastInputSubject.next('Netzwerkfehler bei der Spracherkennung. Bitte erneut versuchen.');
      this.stopRecording();
      return;
    }

    this.networkRetryCount++;
    this.isRetrying = true;
    this.lastInputSubject.next(`Netzwerkproblem bei der Spracherkennung – erneuter Versuch (${this.networkRetryCount}/${this.networkMaxRetries}) ...`);
    // Kurze Pause, dann Abort und erneuter Start
    try {
      try { this.recognition.abort(); } catch (_) { /* ignore */ }
    } catch (_) { /* ignore */ }

    const backoff = 400 + this.networkRetryCount * 250; // leichter Backoff
    setTimeout(() => {
      try {
        // Bei wiederholtem Fehler die Instanz komplett neu erstellen
        if (this.networkRetryCount >= 2 && this.SpeechRecognitionCtor) {
          this.recreateRecognition();
        }
        // UI im Recording-Zustand halten
        this.isRecordingSubject.next(true);
        this.recognition.start();
      } catch (e) {
        console.error('Retry start failed:', e);
        this.isRetrying = false;
        this.stopRecording();
      }
    }, backoff);
  }

  private recreateRecognition(): void {
    try {
      const Ctor = this.SpeechRecognitionCtor || (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Ctor) return;
      this.recognition = new Ctor();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'de-DE';

      // Handlers erneut setzen (spiegeln initializeSpeechRecognition)
      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.9;
        const speechResult: SpeechRecognitionResult = { transcript, confidence, isFinal: result.isFinal };
        this.transcriptSubject.next(speechResult);
        if (result.isFinal) {
          this.lastInputSubject.next(transcript);
          this.saveToDatabase(transcript, confidence);
        }
      };
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event?.error === 'network') {
          this.handleNetworkErrorRetry();
          return;
        }
        this.handleRecognitionError(event?.error);
        this.stopRecording();
      };
      this.recognition.onend = () => {
        if (this.isRetrying) return;
        this.isRecordingSubject.next(false);
      };
      this.recognition.onspeechend = () => {
        this.stopRecording();
      };
    } catch (e) {
      console.error('Failed to recreate recognition:', e);
    }
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

  // Kleine Helper-Funktion für kurze Delays
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  // ============ Server STT Methods ============

  private async shouldUseServerSTT(): Promise<boolean> {
    // Check STT mode preference
    if (this.sttMode === 'server') {
      return true;
    }
    
    if (this.sttMode === 'browser') {
      return false;
    }
    
    // Auto mode: use browser if available and online
    if (this.sttMode === 'auto') {
      // Check if browser STT is available
      if (!this.recognition || !navigator.onLine) {
        return true; // Use server STT
      }
      
      // Default to browser STT in auto mode
      return false;
    }
    
    return false;
  }

  private async startServerRecording(): Promise<void> {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        } 
      });

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 192000
      });
      
      this.recordedChunks = [];
      this.isServerRecording = true;
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Handle recording stop
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 0) {
          await this.transcribeAudioOnServer(audioBlob, mimeType);
        }
        
        this.isServerRecording = false;
        this.isRecordingSubject.next(false);
        this.recordedChunks = [];
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecordingSubject.next(true);
      this.lastInputSubject.next('Aufnahme läuft (Server STT)...');
      
      // Auto-stop after max duration
      this.serverRecordingTimeout = setTimeout(() => {
        if (this.isServerRecording) {
          this.stopServerRecording();
        }
      }, this.maxServerRecordingMs);
      
    } catch (error) {
      console.error('Failed to start server recording:', error);
      this.lastInputSubject.next('Mikrofon-Zugriff verweigert oder nicht verfügbar');
      this.isRecordingSubject.next(false);
      throw error;
    }
  }

  private async stopServerRecording(): Promise<void> {
    if (!this.mediaRecorder || !this.isServerRecording) {
      return;
    }
    
    try {
      if (this.serverRecordingTimeout) {
        clearTimeout(this.serverRecordingTimeout);
        this.serverRecordingTimeout = null;
      }
      
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (error) {
      console.error('Failed to stop server recording:', error);
      this.isRecordingSubject.next(false);
      this.isServerRecording = false;
    }
  }

  private async transcribeAudioOnServer(audioBlob: Blob, mimeType: string): Promise<void> {
    try {
      this.lastInputSubject.next('Transkribiere Audio...');
      
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'de-DE');
      formData.append('maxDurationMs', String(this.maxServerRecordingMs));
      
      // Send to server for transcription
      const result = await lastValueFrom(
        this.http.post<ServerTranscriptionResult>(`${this.apiUrl}/transcribe`, formData)
      );
      
      if (result.success && result.data) {
        const { transcript, confidence, provider } = result.data;
        
        // Emit transcript result
        this.transcriptSubject.next({
          transcript,
          confidence,
          isFinal: true
        });
        
        // Update last input
        this.lastInputSubject.next(transcript);
        
        // Save to database
        await this.saveToDatabase(transcript, confidence);
        
        console.log(`Server STT successful (${provider}): "${transcript}" (confidence: ${confidence})`);
      } else {
        const errorMsg = result.error || result.message || 'Transkription fehlgeschlagen';
        this.lastInputSubject.next(errorMsg);
        console.error('Server STT failed:', result);
      }
    } catch (error: any) {
      console.error('Server transcription error:', error);
      const errorMsg = error?.error?.message || 'Server-Transkription fehlgeschlagen';
      this.lastInputSubject.next(errorMsg);
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
    
    return 'audio/webm'; // Fallback
  }

  // Get current STT mode
  getSTTMode(): STTMode {
    return this.sttMode;
  }

  // Set STT mode and save preference
  setSTTMode(mode: STTMode): void {
    this.sttMode = mode;
    localStorage.setItem('stt-mode', mode);
    console.log(`STT mode set to: ${mode}`);
  }

  // Check server STT status
  async checkServerSTTStatus(): Promise<any> {
    try {
      return await lastValueFrom(
        this.http.get(`${this.apiUrl}/transcribe/status`)
      );
    } catch (error) {
      console.error('Failed to check server STT status:', error);
      return null;
    }
  }
}
