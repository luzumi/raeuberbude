// src/app/shared/components/header/header.component.ts

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgOptimizedImage, Location } from '@angular/common';
import { Router } from '@angular/router';
import { SpeechFeedbackComponent } from '../speech-feedback/speech-feedback.component';
import { AppButtonComponent } from '../app-button/app-button';
import { LogoutButtonComponent } from '../logout-button/logout-button';
import { SpeechService } from '../../../core/services/speech.service';
import { TerminalService } from '../../../core/services/terminal.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    LogoutButtonComponent,
    NgOptimizedImage,
    SpeechFeedbackComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  /** Name des aktuellen Nutzers */
  @Input() userName: string = 'Gast';

  /** Status der Sprachaufnahme */
  isRecording = false;

  /** Letzte Spracheingabe für Marquee-Anzeige */
  lastSpeechInput = '';

  /** Anzeigename des aktuellen Terminals */
  terminalName = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly speechService: SpeechService,
    private readonly terminalService: TerminalService,
  ) {}

  ngOnInit(): void {
    // Aktiviere Validierung und TTS
    this.speechService.setValidationEnabled(true);
    this.speechService.setTTSEnabled(true);

    // Subscribe to last speech input updates
    this.speechService.lastInput$
      .pipe(takeUntil(this.destroy$))
      .subscribe(input => {
        this.lastSpeechInput = input;
        // Auto-clear after 10 seconds
        if (input) {
          setTimeout(() => {
            if (this.lastSpeechInput === input) {
              this.lastSpeechInput = '';
            }
          }, 10000);
        }
      });

    // Subscribe to recording status
    this.speechService.isRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isRecording = status;
      });

    // Terminal-Name laden (falls Gerät bereits zugewiesen ist)
    this.terminalService.getMyTerminal()
      .then(res => {
        this.terminalName = res?.data?.terminalId || '';
      })
      .catch(() => {
        this.terminalName = '';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Navigiert zur Profilseite des Nutzers.
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Öffnet die Menüseite.
   */
  goToMenu(): void {
    this.router.navigate(['/menu']);
  }

  /**
   * Navigiert zur vorherigen Seite.
   */
  goBack(): void {
    this.location.back();
  }

  /** Methode: Benutzer-Icon anklicken */
  onUserProfile(): void {
    this.router.navigate(['/user-profile']);
  }

  /** Tageszeiten-Begrüßung */
  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  /**
   * Toggle speech input recording
   * Bei laufender Aufnahme: Beendet Aufnahme (Stop)
   * Danach wird Verarbeitung gestartet - Button wird zum Abort-Button
   */
  async toggleSpeechInput(): Promise<void> {
    try {
      if (this.isRecording) {
        // Stop recording - Verarbeitung beginnt
        await this.speechService.stopRecording();
        this.lastSpeechInput = 'Verarbeite...';
      } else {
        // Start recording
        await this.speechService.startRecording();
      }
    } catch (error) {
      console.error('Speech input error:', error);
      // Show user-friendly error message
      this.lastSpeechInput = `Fehler bei der Spracheingabe. Bitte erneut versuchen. ${error}`;
    }
  }

  /**
   * Bricht die aktuelle Operation ab
   * Wird aufgerufen wenn User während Verarbeitung abbricht
   */
  abortCurrentOperation(): void {
    this.speechService.abortCurrentOperation();
    this.lastSpeechInput = 'Abgebrochen';
  }
}
