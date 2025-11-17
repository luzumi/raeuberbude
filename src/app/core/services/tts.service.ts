import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TTSOptions {
  lang?: string;
  rate?: number;  // 0.1 to 10
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
}

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  private synth: SpeechSynthesis;
  private readonly isSpeakingSubject = new BehaviorSubject<boolean>(false);
  private voices: SpeechSynthesisVoice[] = [];
  private defaultVoice: SpeechSynthesisVoice | null = null;

  isSpeaking$ = this.isSpeakingSubject.asObservable();

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();

    // Voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();

    // Find German voice
    this.defaultVoice = this.voices.find(voice =>
      voice.lang === 'de-DE' || voice.lang.startsWith('de')
    ) || this.voices[0] || null;

    console.log('TTS: Loaded voices:', this.voices.length);
    if (this.defaultVoice) {
      console.log('TTS: Default voice:', this.defaultVoice.name, this.defaultVoice.lang);
    }
  }

  /**
   * Speak the given text with optional settings
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!text || text.trim().length === 0) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice
      const voice = this.getVoiceForLang(options?.lang || 'de-DE');
      if (voice) {
        utterance.voice = voice;
      }

      // Set properties
      utterance.lang = options?.lang || 'de-DE';
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;

      utterance.onstart = () => {
        this.isSpeakingSubject.next(true);
      };

      utterance.onend = () => {
        this.isSpeakingSubject.next(false);
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event);
        this.isSpeakingSubject.next(false);
        reject(event);
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Cancel any ongoing speech
   */
  cancel(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
      this.isSpeakingSubject.next(false);
    }
  }

  /**
   * Pause ongoing speech
   */
  pause(): void {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Check if TTS is available in this browser
   */
  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Get voice for specific language
   */
  private getVoiceForLang(lang: string): SpeechSynthesisVoice | null {
    return this.voices.find(voice => voice.lang === lang || voice.lang.startsWith(lang.split('-')[0])) || this.defaultVoice;
  }

  /**
   * Speak a confirmation question and wait for user response
   */
  async askConfirmation(question: string, options?: TTSOptions): Promise<void> {
    await this.speak(question, options);
  }

  /**
   * Speak an error message
   */
  async speakError(message: string): Promise<void> {
    await this.speak(message, { rate: 0.9 });
  }

  /**
   * Speak a notification
   */
  async speakNotification(message: string): Promise<void> {
    await this.speak(message, { rate: 1.1 });
  }
}
