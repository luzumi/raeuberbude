// Intent-Typen für verschiedene Anfrage-Arten
export type IntentType =
  | 'home_assistant_command'    // HA Befehle: "Mach Licht aus"
  | 'home_assistant_query'      // HA Abfragen: "Ist das Licht an?"
  | 'navigation'                // App-Navigation: "Zeige Samsung TV"
  | 'web_search'                // Internet-Suche: "Wie hat Werder gespielt?"
  | 'greeting'                  // Begrüßung: "Hallo"
  | 'general_question'          // Allgemeine Fragen: "Wie spät ist es?"
  | 'unknown';                  // Unbekannt/Unklar

export interface IntentRecognitionResult {
  intent: IntentType;
  confidence: number;
  originalTranscript: string;

  // Für Home Assistant Befehle/Abfragen
  homeAssistant?: {
    action?: 'turn_on' | 'turn_off' | 'set' | 'toggle' | 'query';
    entityType?: string;        // 'light', 'switch', 'media_player', etc.
    location?: string;          // 'wohnzimmer', 'küche', etc.
    attributes?: Record<string, any>;
  };

  // Für Navigation
  navigation?: {
    target: string;             // 'samsung-tv', 'dashboard', 'settings', etc.
    parameters?: Record<string, any>;
  };

  // Für Web-Suche
  webSearch?: {
    query: string;
    searchType?: 'general' | 'sports' | 'news' | 'weather';
  };

  // Zusammenfassung
  summary: string;              // Kurze Beschreibung was erkannt wurde
  keywords: string[];           // Wichtige Schlagworte
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  issues?: string[];

  // NEU: Intent-Erkennung
  intent?: IntentRecognitionResult;
}

