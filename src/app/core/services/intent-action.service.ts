import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IntentRecognitionResult } from '../models/intent-recognition.model';
import { Subject } from 'rxjs';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  showDialog?: boolean;
  isLoading?: boolean;
  dialogContent?: {
    title: string;
    content: string;
    type: 'ha_command' | 'ha_query' | 'web_search' | 'greeting' | 'general';
    links?: Array<{ title: string; url: string }>;
    isLoading?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IntentActionService {
  private readonly actionResultSubject = new Subject<ActionResult>();
  actionResult$ = this.actionResultSubject.asObservable();

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient
  ) {}

  /**
   * Zeigt sofort Loading-Dialog an (vor Intent-Verarbeitung)
   */
  showLoadingDialog(transcript: string): void {
    this.actionResultSubject.next({
      success: true,
      message: 'Verarbeite Anfrage...',
      showDialog: true,
      isLoading: true,
      dialogContent: {
        title: 'Wird verarbeitet...',
        content: `
          <div class="loading-state">
            <div class="spinner"></div>
            <p class="transcript">"${transcript}"</p>
            <p class="status">Analysiere Ihre Anfrage...</p>
          </div>
        `,
        type: 'general',
        isLoading: true
      }
    });
  }

  /**
   * Verarbeitet Intent und führt entsprechende Aktion aus
   */
  async handleIntent(intent: IntentRecognitionResult): Promise<ActionResult> {
    console.log('Handling Intent:', intent.intent, intent);

    try {
      switch (intent.intent) {
        case 'home_assistant_command':
          return await this.handleHomeAssistantCommand(intent);

        case 'home_assistant_query':
          return await this.handleHomeAssistantQuery(intent);

        case 'home_assistant_queryautomation':
          return await this.handleHomeAssistantQueryAutomation(intent);

        case 'navigation':
          return await this.handleNavigation(intent);

        case 'web_search':
          return await this.handleWebSearch(intent);

        case 'greeting':
          return this.handleGreeting(intent);

        case 'general_question':
          return this.handleGeneralQuestion(intent);

        default:
          return {
            success: false,
            message: 'Intent konnte nicht verarbeitet werden',
            showDialog: true,
            dialogContent: {
              title: 'Unbekannte Anfrage',
              content: `Ich bin mir nicht sicher wie ich "${intent.originalTranscript}" verarbeiten soll.`,
              type: 'general'
            }
          };
      }
    } catch (error) {
      console.error('Intent handling error:', error);
      return {
        success: false,
        message: 'Fehler bei der Verarbeitung',
        showDialog: true,
        dialogContent: {
          title: 'Fehler',
          content: `Ein Fehler ist aufgetreten: ${error}`,
          type: 'general'
        }
      };
    } finally {
      // Log the action
      await this.logAction(intent);
    }
  }

  /**
   * Sendet ActionResult über Observable (für Dialog-Updates)
   */
  emitResult(result: ActionResult): void {
    this.actionResultSubject.next(result);
  }

  /**
   * Home Assistant Befehle (erstmal nur logging + Dialog)
   */
  private async handleHomeAssistantCommand(intent: IntentRecognitionResult): Promise<ActionResult> {
    const ha = intent.homeAssistant;
    if (!ha) {
      return {
        success: false,
        message: 'Keine Home Assistant Daten gefunden',
        showDialog: false
      };
    }

    // TODO: Später - tatsächlichen HA-Befehl ausführen
    // Erstmal: Dialog mit erkannten Entitäten

    const actionText = this.getActionText(ha.action);
    const entityText = ha.entityType ? ` ${ha.entityType}` : '';
    const locationText = ha.location ? ` im ${ha.location}` : '';

    return {
      success: true,
      message: `HA Befehl erkannt: ${actionText}${entityText}${locationText}`,
      showDialog: true,
      dialogContent: {
        title: 'Home Assistant Befehl',
        content: `
          <div class="ha-command-preview">
            <h3>${actionText}${entityText}${locationText}</h3>
            <div class="keywords">
              <strong>Schlagworte:</strong> ${intent.keywords.join(', ')}
            </div>
            <div class="detected-entities">
              <strong>Erkannte Details:</strong>
              <ul>
                ${ha.action ? `<li>Aktion: <code>${ha.action}</code></li>` : ''}
                ${ha.entityType ? `<li>Gerätetyp: <code>${ha.entityType}</code></li>` : ''}
                ${ha.location ? `<li>Raum: <code>${ha.location}</code></li>` : ''}
              </ul>
            </div>
            <p class="note">
              ℹ️ Zuordnung zu konkreten Entitäten erfolgt später über Datenbank-Mapping.
            </p>
          </div>
        `,
        type: 'ha_command'
      }
    };
  }

  /**
   * Home Assistant Abfragen
   */
  private async handleHomeAssistantQuery(intent: IntentRecognitionResult): Promise<ActionResult> {
    const ha = intent.homeAssistant;

    return {
      success: true,
      message: 'HA Abfrage erkannt',
      showDialog: true,
      dialogContent: {
        title: 'Home Assistant Abfrage',
        content: `
          <div class="ha-query-preview">
            <h3>${intent.summary}</h3>
            <p>Schlagworte: ${intent.keywords.join(', ')}</p>
            <p class="note">
              ℹ️ Abfrage-Funktion wird implementiert.
            </p>
          </div>
        `,
        type: 'ha_query'
      }
    };
  }

  /**
   * Home Assistant Automation Abfragen
   */
  private async handleHomeAssistantQueryAutomation(intent: IntentRecognitionResult): Promise<ActionResult> {
    return {
      success: true,
      message: 'HA Automation Abfrage erkannt',
      showDialog: true,
      dialogContent: {
        title: 'Home Assistant Automation',
        content: `
          <div class="ha-query-preview">
            <h3>${intent.summary}</h3>
            <p>Schlagworte: ${intent.keywords.join(', ')}</p>
            <p class="note">
              ℹ️ Automation-Abfrage wird implementiert.
            </p>
          </div>
        `,
        type: 'ha_query'
      }
    };
  }

  /**
   * App-Navigation (kein Dialog - direkte Navigation)
   */
  private async handleNavigation(intent: IntentRecognitionResult): Promise<ActionResult> {
    const nav = intent.navigation;
    if (!nav?.target) {
      return {
        success: false,
        message: 'Kein Navigationsziel gefunden',
        showDialog: false
      };
    }

    // Route-Mapping
    const routeMap: Record<string, string> = {
      'samsung-tv': '/rooms/samsung-tv',
      'dashboard': '/dashboard',
      'settings': '/settings',
      'fire-tv': '/rooms/fire-tv',
      'laptop': '/rooms/laptop',
      'pc': '/rooms/pc'
    };

    const route = routeMap[nav.target] || `/${nav.target}`;

    console.log('Navigating to:', route);
    await this.router.navigate([route]);

    return {
      success: true,
      message: `Navigiere zu ${nav.target}`,
      showDialog: false  // Kein Dialog bei Navigation
    };
  }

  /**
   * Web-Suche (Dialog mit Suchergebnissen/Links)
   */
  private async handleWebSearch(intent: IntentRecognitionResult): Promise<ActionResult> {
    const search = intent.webSearch;
    if (!search?.query) {
      return {
        success: false,
        message: 'Keine Suchanfrage gefunden',
        showDialog: false
      };
    }

    // TODO: Später - echte Websuche mit MCP oder API
    // Erstmal: Dialog mit Link zur Suche

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(search.query)}`;
    const duckduckgoUrl = `https://duckduckgo.com/?q=${encodeURIComponent(search.query)}`;

    return {
      success: true,
      message: `Suche nach: ${search.query}`,
      showDialog: true,
      dialogContent: {
        title: 'Web-Suche',
        content: `
          <div class="web-search-result">
            <h3>${search.query}</h3>
            <p>Ihre Anfrage: "${intent.originalTranscript}"</p>
            <div class="search-links">
              <p>Suchergebnisse öffnen:</p>
            </div>
            <p class="note">
              💡 Später wird hier eine integrierte Suche mit Zusammenfassung angezeigt.
            </p>
          </div>
        `,
        type: 'web_search',
        links: [
          { title: '🔍 Google Suche', url: searchUrl },
          { title: '🦆 DuckDuckGo', url: duckduckgoUrl }
        ]
      }
    };
  }

  /**
   * Begrüßung
   */
  private handleGreeting(intent: IntentRecognitionResult): ActionResult {
    const responses = [
      'Hallo! Wie kann ich Ihnen helfen?',
      'Guten Tag! Was kann ich für Sie tun?',
      'Herzlich willkommen!',
      'Hallo! Ich höre.'
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      message: response,
      showDialog: false  // Begrüßungen brauchen keinen Dialog
    };
  }

  /**
   * Allgemeine Fragen
   */
  private handleGeneralQuestion(intent: IntentRecognitionResult): ActionResult {
    // Einfache Antworten für bekannte Fragen
    const transcript = intent.originalTranscript.toLowerCase();

    if (transcript.includes('uhr') || transcript.includes('spät')) {
      const now = new Date();
      const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return {
        success: true,
        message: `Es ist ${time} Uhr`,
        showDialog: true,
        dialogContent: {
          title: 'Uhrzeit',
          content: `<div style="font-size: 2em; text-align: center; padding: 20px;">${time}</div>`,
          type: 'general'
        }
      };
    }

    if (transcript.includes('datum') || transcript.includes('tag')) {
      const now = new Date();
      const date = now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        success: true,
        message: `Heute ist ${date}`,
        showDialog: true,
        dialogContent: {
          title: 'Datum',
          content: `<div style="font-size: 1.5em; text-align: center; padding: 20px;">${date}</div>`,
          type: 'general'
        }
      };
    }

    return {
      success: true,
      message: 'Interessante Frage!',
      showDialog: true,
      dialogContent: {
        title: 'Allgemeine Frage',
        content: `<p>${intent.summary}</p><p class="note">Diese Frage wird noch nicht beantwortet.</p>`,
        type: 'general'
      }
    };
  }

  /**
   * Helper: Action-Text generieren
   */
  private getActionText(action?: string): string {
    const actionMap: Record<string, string> = {
      'turn_on': 'Einschalten',
      'turn_off': 'Ausschalten',
      'toggle': 'Umschalten',
      'set': 'Einstellen',
      'query': 'Abfragen'
    };
    return action ? actionMap[action] || action : 'Aktion';
  }

  /**
   * Logging (erstmal Console, später DB)
   */
  private async logAction(intent: IntentRecognitionResult): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      transcript: intent.originalTranscript,
      intent: intent.intent,
      summary: intent.summary,
      keywords: intent.keywords,
      confidence: intent.confidence,
      terminalId: localStorage.getItem('terminal-id') || 'unknown'
    };

    console.log('📝 Action Log:', logEntry);

    // Optional: An Backend-API senden für persistentes Logging (falls verfügbar)
    try {
      await this.http.post('/api/intent-logs', logEntry).toPromise();
    } catch (err) {
      // Endpoint noch nicht implementiert - ignorieren
      console.debug('[IntentAction] Intent logging endpoint not available yet');
    }
  }
}

