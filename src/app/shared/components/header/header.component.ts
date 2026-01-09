// src/app/shared/components/header/header.component.ts

import {CommonModule, Location, NgOptimizedImage} from '@angular/common';
import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatFormField, MatInput} from '@angular/material/input';
import {Router} from '@angular/router';
import {Subject} from 'rxjs';
import {filter, skip, take, takeUntil} from 'rxjs/operators';
import {SpeechService} from '../../../core/services/speech.service';
import {TerminalService} from '../../../core/services/terminal.service';
import {AppButtonComponent} from '../app-button/app-button';
import {LogoutButtonComponent} from '../logout-button/logout-button';
import {SpeechFeedbackComponent} from '../speech-feedback/speech-feedback.component';

@Component( {
    selector: 'app-header',
    standalone: true,
    imports: [
        CommonModule,
        AppButtonComponent,
        LogoutButtonComponent,
        NgOptimizedImage,
        SpeechFeedbackComponent,
        MatInput,
        FormsModule,
        MatFormField,
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
} )
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
    protected textInput: string = 'Schalte alle Lichter aus!';

    constructor(
        private readonly router: Router,
        private readonly location: Location,
        private readonly speechService: SpeechService,
        private readonly terminalService: TerminalService,
    ) {}

    ngOnInit(): void {
        // Aktiviere Validierung und TTS
        this.speechService.setValidationEnabled( true );

        // Subscribe to last speech input updates
        this.speechService.lastInput$.pipe( takeUntil( this.destroy$ ) ).subscribe( input => {
            this.lastSpeechInput = input;
            // Auto-clear after 10 seconds
            if ( input ) {
                setTimeout( () => {
                    if ( this.lastSpeechInput === input ) {
                        this.lastSpeechInput = '';
                    }
                }, 10000 );
            }
        } );

        // Subscribe to recording status
        this.speechService.isRecording$.pipe( takeUntil( this.destroy$ ) ).subscribe( status => {
            this.isRecording = status;
        } );

        // Terminal-Name laden (falls Gerät bereits zugewiesen ist)
        this.terminalService.getMyTerminal().then( res => {
            this.terminalName = res?.data?.terminalId || '';
        } ).catch( () => {
            this.terminalName = '';
        } );
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Navigiert zur Profilseite des Nutzers.
     */
    goToProfile(): void {
        this.router.navigate( ['/profile'] );
    }

    /**
     * Öffnet die Menüseite.
     */
    goToMenu(): void {
        this.router.navigate( ['/menu'] );
    }

    /**
     * Öffnet die Menüseite.
     */
    goToHome(): void {
        this.router.navigate( ['/'] );
    }


    /**
     * Navigiert zur vorherigen Seite.
     */
    goBack(): void {
        this.location.back();
    }

    /** Methode: Benutzer-Icon anklicken */
    onUserProfile(): void {
        this.router.navigate( ['/user-profile'] );
    }

    /** Tageszeiten-Begrüßung */
    get greeting(): string {
        const h = new Date().getHours();
        if ( h < 12 ) return 'Guten Morgen';
        if ( h < 18 ) return 'Guten Tag';
        return 'Guten Abend';
    }

    /**
     * Toggle speech input recording
     * Bei laufender Aufnahme: Beendet Aufnahme (Stop)
     * Danach wird Verarbeitung gestartet - Button wird zum Abort-Button
     */
    async toggleSpeechInput(): Promise<void> {
        try {
            if ( this.isRecording ) {
                // Stop recording - Verarbeitung beginnt
                await this.speechService.stopRecording();

                // Zeige unmittelbar eine Verarbeitungs-Nachricht, aber überschreibe
                // diese nicht dauerhaft: Falls das SpeechService eine Antwort emittiert,
                // wird unsere Meldung ersetzt. Falls nicht, zeigen wir nach 12s eine
                // Fehler-Meldung statt dauerhaft "Verarbeite...".
                this.lastSpeechInput = 'Verarbeite...';

                // Start a failsafe watcher that clears the status if no result arrives
                const fallbackTimeout = setTimeout( () => {
                    if ( this.lastSpeechInput === 'Verarbeite...' ) {
                        this.lastSpeechInput = 'Fehler bei der Verarbeitung. Bitte erneut versuchen.';
                    }
                }, 12000 );

                // Subscribe once to the next meaningful lastInput emission and cancel timeout
                let sub: any = null;
                sub = this.speechService.lastInput$.pipe( skip( 1 ), filter( (v: string) => !!v && v !== 'Verarbeite...' ), take( 1 ) ).subscribe( () => {
                    // clear fallback once we got a meaningful emission
                    clearTimeout( fallbackTimeout );
                    if ( sub ) { sub.unsubscribe(); }
                } );

            } else {
                // Start recording
                // clear any previous UI status so user sees 'Höre zu...'
                this.lastSpeechInput = '';
                await this.speechService.startRecording();
            }
        } catch( error ) {
            console.error( 'Speech input error:', error );
            // Show user-friendly error message
            this.lastSpeechInput = `Fehler bei der Spracheingabe. Bitte erneut versuchen. ${ error }`;
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

    protected sendTextInputToLLM(): void {
        const text = (this.textInput || '').trim();
        if (!text) {
            return; // nothing to send
        }

        try {
            // Show immediate processing feedback (will be overwritten by SpeechService emits)
            this.lastSpeechInput = 'Verarbeite...';

            // Failsafe: clear message or show error after timeout if no update arrives
            const fallbackTimeout = setTimeout(() => {
                if (this.lastSpeechInput === 'Verarbeite...') {
                    this.lastSpeechInput = 'Fehler bei der Verarbeitung. Bitte erneut versuchen.';
                }
            }, 12000);

            // Subscribe once to next meaningful emission to cancel fallback
            const sub = this.speechService.lastInput$.pipe(skip(1), filter((v: string) => !!v && v !== 'Verarbeite...'), take(1)).subscribe(() => {
                clearTimeout(fallbackTimeout);
                sub.unsubscribe();
            });

            // Delegate to speech service - treat typed text like transcribed speech
            this.speechService.submitText(text).catch(err => {
                console.error('submitText failed:', err);
            });

            // Keep the text in the input (per requirement)
        } catch (error) {
            console.error('sendTextInputToLLM error:', error);
            this.lastSpeechInput = `Fehler bei der Verarbeitung: ${error}`;
        }
    }
}
