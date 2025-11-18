import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { IntentRecognitionResult, IntentType } from '../models/intent-recognition.model';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  issues?: string[]; // optional

  // Intent-Erkennung
  intent?: IntentRecognitionResult;
}

interface LMStudioResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  model: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionValidatorService {
  private readonly lmStudioUrl = 'http://192.168.56.1:1234/v1/chat/completions';
  private readonly model = 'mistralai/mistral-7b-instruct-v0.3';
  // Use relative URL - will be proxied to backend
  private readonly backendApiUrl = '';

  constructor(private readonly http: HttpClient) {}

  /**
   * Performance timer helper
   */
  private startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  // German stop words and common filler words
  private readonly germanStopWords = new Set([
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber',
    'in', 'zu', 'von', 'mit', 'bei', 'auf', 'an', 'für'
  ]);

  // Common nonsensical patterns in German STT
  private readonly nonsensePatterns = [
    /^[äöüß\s]+$/i,  // Only umlauts
    /(.)\1{4,}/,      // Character repeated 5+ times
    /^[^aeiouäöü\s]{8,}$/i, // 8+ consonants without vowels
    /\d{8,}/,         // Very long number sequences
  ];

  // Minimum meaningful word length for German
  private readonly minMeaningfulWords = 2;
  private readonly minWordLength = 2;

  // Erweiterte Deutsch-Heuristiken
  // Häufige deutsche Kernwörter (Befehle, Artikel, Alltagswörter)
  private readonly germanCoreWords = new Set([
    'der','die','das','ein','eine','den','dem','und','oder','aber','bitte','machen','mach','schalte','licht','lampe','fernseher','tv','musik','laut','leiser','stopp','stop','start','öffne','schließe','raum','zimmer','heizung','temperatur','status','zeige','wetter','computer','pc','monitor','hell','dunkel','an','aus','weiter','zurück','hilfe','menü','menue'
  ]);

  // Zeichen und Cluster, die auf Polnisch / andere Sprache hindeuten (vereinfachte Heuristik)
  private readonly foreignCharPattern = /[łśźżąęńćòŠŽŁĆĘĄŃŻŹ]/i; // typische nicht-deutsche diakritische Zeichen
  private readonly foreignClusters = [
    'szcz','cz','rz','dz','dź','dż','ł','ś','ź','ż'
  ];

  // Erlaubte deutsche Basis-Buchstaben inkl. Umlaute
  private readonly germanLettersPattern = /^[a-zA-Zäöüß0-9\s.,!?'-]+$/;

  /** Berechnet einen einfachen Deutsch-Score (0..1) basierend auf Kernwörtern und bekannten Mustern */
  private computeGermanScore(words: string[]): number {
    if (!words.length) return 0;
    let coreHits = 0;
    for (const w of words) {
      if (this.germanCoreWords.has(w)) coreHits++;
    }
    const ratio = coreHits / words.length;
    // Bonus für Umlaute (typisch deutsch) und Verwendung von Artikeln
    const umlautCount = words.filter(w => /[äöüß]/.test(w)).length;
    const umlautBonus = Math.min(0.15, umlautCount * 0.03);
    return Math.min(1, ratio + umlautBonus);
  }

  /** Prüft auf starke Hinweise für andere Sprache (hier grob polnisch / nicht deutsch) */
  private detectForeignIndicators(transcript: string): number {
    let indicators = 0;
    if (this.foreignCharPattern.test(transcript)) indicators += 2;
    for (const cluster of this.foreignClusters) {
      if (transcript.includes(cluster)) indicators++;
    }
    const consonantRuns = transcript.match(/[^aeiouäöü\s]{5,}/gi)?.length || 0;
    indicators += consonantRuns;
    return indicators;
  }

  /** Prüft ob das eher Geräusch / nicht Sprache ist (zu wenig Vokale, kaum bekannte Wörter) */
  private looksLikeNoise(transcript: string, germanScore: number): boolean {
    const onlyLetters = transcript.replace(/[^a-zA-Zäöüß]/g, '').toLowerCase();
    if (!onlyLetters) return true;
    const vowels = onlyLetters.match(/[aeiouäöü]/g)?.length || 0;
    const vowelRatio = vowels / onlyLetters.length;
    if (vowelRatio < 0.25 && germanScore < 0.15) return true;
    return /(.)\1{5,}/.test(onlyLetters);
  }

  /** Reinstate hasLikelyVerb helper */
  private hasLikelyVerb(words: string[]): boolean {
    const germanVerbEndings = ['en','st','et','t','e'];
    const commonVerbs = new Set([
      'ist','sind','war','waren','hat','haben','wird','werden','kann','könnte','soll','sollte','muss','musste','will','wollte',
      'mach','mache','machen','schalte','schalten','öffne','öffnen','schließe','schließen','zeig','zeige','zeigen','gib','geben',
      'spiel','spiele','spielen','starte','starten','stoppe','stoppen'
    ]);
    return words.some(w => commonVerbs.has(w) || (w.length > 3 && germanVerbEndings.some(e => w.endsWith(e))));
  }

  private isGreetingLike(transcript: string, words: string[]): boolean {
    const t = transcript.toLowerCase();
    if (/^(hallo|guten\s+(morgen|tag|abend))/.test(t)) return true;
    if (t.includes('willkommen')) return true;
    if (t.startsWith('hallo und herzlich willkommen')) return true;
    return false;
  }

  /**
   * Validate transcription using LLM (Mistral via LM Studio)
   * With performance tracking and database logging
   */
  async validateLocally(
    transcript: string,
    originalConfidence: number,
    userId?: string,
    terminalId?: string
  ): Promise<ValidationResult> {
    const timerTotal = this.startTimer();
    const timings: any = {};
    let fallbackUsed = false;
    let error: string | undefined;

    console.log(`[Validation] Starting validation for: "${transcript}" (confidence: ${originalConfidence})`);

    // Fallback für sehr kurze/leere Transkripte
    if (!transcript || transcript.trim().length < 2) {
      const result = {
        isValid: false,
        confidence: 0,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: `Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.`,
        issues: undefined
      };

      // Log to DB
      this.logTranscriptToDb({
        userId: userId || 'unknown',
        terminalId,
        transcript,
        sttConfidence: originalConfidence,
        result,
        durationMs: timerTotal(),
        timings,
        error: 'Transcript too short'
      }).catch(err => console.error('Failed to log transcript:', err));

      return result;
    }

    try {
      // Pre-processing: Heuristic checks
      const timerPreProcess = this.startTimer();
      const words = transcript.toLowerCase().trim().split(/\s+/).filter(w => w.length >= this.minWordLength);
      const germanScore = this.computeGermanScore(words);
      const hasVerb = this.hasLikelyVerb(words);
      const isGreeting = this.isGreetingLike(transcript, words);
      timings.preProcessMs = timerPreProcess();

      console.log(`[Validation] Pre-process: germanScore=${germanScore.toFixed(2)}, hasVerb=${hasVerb}, isGreeting=${isGreeting} (${timings.preProcessMs}ms)`);

      // Heuristic shortcut: Skip LLM if high confidence and good German
      const confidenceThreshold = 0.85; // From environment in production
      if (originalConfidence >= confidenceThreshold && germanScore > 0.5 && (hasVerb || isGreeting)) {
        console.log(`[Validation] ✅ Heuristic bypass: High confidence + good German score → skip LLM`);

        const result: ValidationResult = {
          isValid: true,
          confidence: originalConfidence,
          hasAmbiguity: false,
          clarificationNeeded: false,
          issues: undefined,
          intent: {
            intent: isGreeting ? 'greeting' : 'unknown',
            confidence: originalConfidence,
            originalTranscript: transcript,
            summary: transcript,
            keywords: words.slice(0, 5)
          }
        };

        // Log to DB
        this.logTranscriptToDb({
          userId: userId || 'unknown',
          terminalId,
          transcript,
          sttConfidence: originalConfidence,
          result,
          durationMs: timerTotal(),
          timings,
          fallbackUsed: false,
          bypassUsed: true
        }).catch(err => console.error('Failed to log transcript:', err));

        return result;
      }

      // LLM-Validierung
      const timerLlm = this.startTimer();
      const llmResult = await this.validateWithLLM(transcript, originalConfidence);
      timings.llmMs = timerLlm();

      console.log(`[Validation] ✅ LLM validation completed (${timings.llmMs}ms)`);

      // Log to DB
      const timerDb = this.startTimer();
      try {
        await this.logTranscriptToDb({
          userId: userId || 'unknown',
          terminalId,
          transcript,
          sttConfidence: originalConfidence,
          result: llmResult,
          durationMs: timerTotal(),
          timings,
          fallbackUsed,
          error
        });
        timings.dbMs = timerDb();
      } catch (dbError) {
        console.error('[Validation] Failed to log to DB:', dbError);
        timings.dbMs = timerDb();
      }

      console.log(`[Validation] ✅ Total time: ${timerTotal()}ms (preProcess: ${timings.preProcessMs}ms, llm: ${timings.llmMs}ms, db: ${timings.dbMs}ms)`);

      return llmResult;
    } catch (err) {
      console.error('[Validation] ❌ LLM validation failed, using simple fallback:', err);
      fallbackUsed = true;
      error = err instanceof Error ? err.message : String(err);

      // Fallback: Bei LLM-Fehler akzeptieren wir die Eingabe mit reduzierter Confidence
      const result: ValidationResult = {
        isValid: true,
        confidence: originalConfidence * 0.7,
        hasAmbiguity: true,
        clarificationNeeded: false,
        issues: ['LLM nicht erreichbar']
      };

      // Log to DB
      this.logTranscriptToDb({
        userId: userId || 'unknown',
        terminalId,
        transcript,
        sttConfidence: originalConfidence,
        result,
        durationMs: timerTotal(),
        timings,
        fallbackUsed,
        error
      }).catch(err => console.error('Failed to log transcript:', err));

      return result;
    }
  }

  /**
   * Log transcript validation to database
   */
  private async logTranscriptToDb(data: {
    userId: string;
    terminalId?: string;
    transcript: string;
    sttConfidence: number;
    result: ValidationResult;
    durationMs: number;
    timings: any;
    fallbackUsed?: boolean;
    bypassUsed?: boolean;
    error?: string;
  }): Promise<void> {
    try {
      const payload = {
        userId: data.userId,
        terminalId: data.terminalId,
        transcript: data.transcript,
        sttConfidence: data.sttConfidence,
        aiAdjustedText: data.result.suggestions?.[0] || data.transcript,
        suggestions: data.result.suggestions || [],
        suggestionFlag: !!data.result.clarificationNeeded,
        category: data.result.intent?.intent || 'unknown',
        intent: data.result.intent,
        isValid: data.result.isValid,
        confidence: data.result.confidence,
        hasAmbiguity: data.result.hasAmbiguity,
        clarificationNeeded: data.result.clarificationNeeded,
        clarificationQuestion: data.result.clarificationQuestion,
        durationMs: data.durationMs,
        timings: data.timings,
        model: this.model,
        llmUrl: this.lmStudioUrl,
        llmProvider: 'lmstudio',
        temperature: 0.3,
        maxTokens: 500,
        fallbackUsed: data.fallbackUsed || false,
        error: data.error
      };

      await lastValueFrom(
        this.http.post(`${this.backendApiUrl}/api/transcripts`, payload, {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    } catch (err) {
      console.error('[Validation] Failed to log to database:', err);
      // Don't throw - logging failure should not break validation
    }
  }

  /**
   * Validate transcription using LLM (Mistral via LM Studio)
   * Returns timing information in the result
   */
  private async validateWithLLM(
    transcript: string,
    originalConfidence: number
  ): Promise<ValidationResult & { networkMs?: number }> {
    const timerNetwork = this.startTimer();

    const systemPrompt = `Du bist ein intelligenter Intent-Classifier für ein Smart Home System auf Deutsch.
Deine Aufgaben:
1. Validiere ob die Spracheingabe sinnvoll ist
2. Erkenne die ABSICHT (Intent) des Benutzers
3. Extrahiere relevante Informationen

Antworte NUR mit einem JSON-Objekt (keine zusätzlichen Erklärungen):
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "hasAmbiguity": true/false,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "Rückfrage oder null",
  "intent": {
    "type": "home_assistant_command|home_assistant_query|navigation|web_search|greeting|general_question|unknown",
    "summary": "Kurze Beschreibung",
    "keywords": ["Wort1", "Wort2"],
    "homeAssistant": { "action": "turn_on|turn_off|set|toggle|query", "entityType": "light|switch|media_player|...", "location": "wohnzimmer|..." } oder null,
    "navigation": { "target": "samsung-tv|dashboard|..." } oder null,
    "webSearch": { "query": "Suchbegriff", "searchType": "sports|news|weather|general" } oder null
  }
}

INTENT-TYPEN:
1. home_assistant_command: Befehle an Smart Home Geräte
   - "Mach das Licht aus" → action=turn_off, entityType=light
   - "Schalte TV ein" → action=turn_on, entityType=media_player
   - "Stelle Heizung auf 22 Grad" → action=set, entityType=climate

2. home_assistant_query: Abfragen über Smart Home Status
   - "Ist das Licht an?" → action=query, entityType=light
   - "Welche Temperatur hat es?" → action=query, entityType=sensor

3. navigation: App-Navigation
   - "Zeige mir den Samsung TV" → target=samsung-tv
   - "Öffne Dashboard" → target=dashboard
   - "Gehe zu Einstellungen" → target=settings

4. web_search: Internet-Anfragen
   - "Wie hat Werder Bremen heute gespielt?" → query="Werder Bremen Spielergebnis heute", searchType=sports
   - "Wetter morgen" → query="Wetter morgen", searchType=weather
   - "Wo wird heute Fußball übertragen?" → query="Fußball Übertragung heute", searchType=sports

5. greeting: Begrüßungen
   - "Hallo", "Guten Morgen", etc.

6. general_question: Allgemeine Fragen
   - "Wie spät ist es?"
   - "Welcher Tag ist heute?"

7. unknown: Unklare Eingaben

Beispiele:
"Schalte alle Lichter im Wohnzimmer aus" → intent.type=home_assistant_command, homeAssistant={action:turn_off, entityType:light, location:wohnzimmer}, keywords=["lichter","wohnzimmer","aus"]
"Zeige Samsung TV" → intent.type=navigation, navigation={target:samsung-tv}, keywords=["samsung","tv"]
"Wie hat Werder heute gespielt?" → intent.type=web_search, webSearch={query:"Werder Bremen Spielergebnis heute", searchType:sports}, keywords=["werder","gespielt"]
"Hallo" → intent.type=greeting, keywords=["hallo"]`;

    const userPrompt = `STT-Confidence: ${(originalConfidence * 100).toFixed(0)}%
Transkript: "${transcript}"

Validiere diese Spracheingabe.`;

    try {
      // Mistral unterstützt nur user/assistant Rollen - kombiniere System-Prompt in erste User-Message
      const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

      const response = await lastValueFrom(
        this.http.post<LMStudioResponse>(
          this.lmStudioUrl,
          {
            model: this.model,
            messages: [
              { role: 'user', content: combinedPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
            stream: false
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );

      const networkMs = timerNetwork();
      console.log(`[Validation] LLM network + inference time: ${networkMs}ms`);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty LLM response');
      }

      // Parse JSON aus der LLM-Antwort
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('LLM response not JSON:', content);
        throw new Error('Invalid LLM response format');
      }

      const llmResult = JSON.parse(jsonMatch[0]);

      // Intent-Erkennung parsen
      let intent: IntentRecognitionResult | undefined;
      if (llmResult.intent) {
        intent = {
          intent: llmResult.intent.type as IntentType || 'unknown',
          confidence: typeof llmResult.confidence === 'number' ? llmResult.confidence : originalConfidence,
          originalTranscript: transcript,
          summary: llmResult.intent.summary || transcript,
          keywords: Array.isArray(llmResult.intent.keywords) ? llmResult.intent.keywords : [],
          homeAssistant: llmResult.intent.homeAssistant || undefined,
          navigation: llmResult.intent.navigation || undefined,
          webSearch: llmResult.intent.webSearch || undefined
        };
      }

      // Validierung des LLM-Results und Mapping
      const result: ValidationResult & { networkMs?: number } = {
        isValid: llmResult.isValid === true,
        confidence: typeof llmResult.confidence === 'number' ? llmResult.confidence : originalConfidence,
        hasAmbiguity: llmResult.hasAmbiguity === true,
        clarificationNeeded: llmResult.clarificationNeeded === true,
        clarificationQuestion: llmResult.clarificationQuestion || undefined,
        suggestions: Array.isArray(llmResult.suggestions) ? llmResult.suggestions : undefined,
        issues: undefined,
        intent,
        networkMs
      };

      console.log('[Validation] LLM Validation Result:', result);
      console.log('[Validation] Detected Intent:', intent?.intent, intent?.summary);
      return result;

    } catch (error: any) {
      console.error('LLM validation error:', error);

      // Bei Netzwerkfehler oder LLM nicht erreichbar
      if (error.status === 0 || error.status === 404) {
        console.warn('LM Studio not reachable at', this.lmStudioUrl);
      }

      throw error;
    }
  }

  /**
   * Legacy method - kept for reference but not used
   * @deprecated Use validateLocally instead
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateLocallyOld(
    transcript: string,
    originalConfidence: number
  ): Promise<ValidationResult> {
    // Variablen für Validierungsergebnisse
    const issues: string[] = [];
    let isValid = true;
    let hasAmbiguity = false;
    let clarificationNeeded = false;
    let clarificationQuestion: string | undefined;
    // Flags für vereinheitlichte Rückfrage
    let flagLowGerman = false;
    let flagNoVerb = false;
    let flagFewMeaningful = false;
    let flagNoise = false;

    // Check if transcript is empty or too short
    if (!transcript || transcript.trim().length < 3) {
      issues.push('Transkription zu kurz oder leer');
      isValid = false;
      clarificationNeeded = true;
      clarificationQuestion = `Ich konnte Sie nicht richtig verstehen. Haben Sie "${transcript}" gesagt? Bitte sprechen Sie noch einmal deutlicher.`;
      return {
        isValid,
        confidence: 0,
        hasAmbiguity,
        clarificationNeeded,
        clarificationQuestion,
        issues: undefined // Detaillierte Issues hier nicht nötig
      };
    }

    const normalizedTranscript = transcript.toLowerCase().trim();
    const words = normalizedTranscript.split(/\s+/).filter(w => w.length >= this.minWordLength);
    const germanScore = this.computeGermanScore(words);
    const foreignIndicators = this.detectForeignIndicators(normalizedTranscript);
    const noiseLike = this.looksLikeNoise(normalizedTranscript, germanScore);
    const isGreeting = this.isGreetingLike(normalizedTranscript, words);

    // Fremdsprache – eigener spezieller Hinweis
    if (foreignIndicators >= 2 && germanScore < 0.2) {
      issues.push('Vermutlich andere Sprache erkannt (nicht Deutsch)');
      hasAmbiguity = true;
      if (originalConfidence < 0.85) {
        clarificationNeeded = true;
        clarificationQuestion = `Haben Sie auf Deutsch gesprochen? Haben Sie "${transcript}" gesagt? Bitte wiederholen Sie Ihren Befehl deutlich auf Deutsch.`;
      }
    }

    // Geräusch
    if (noiseLike) {
      hasAmbiguity = true;
      flagNoise = true;
      if (originalConfidence < 0.8) {
        clarificationNeeded = true;
      }
    }

    if (!this.germanLettersPattern.test(transcript) && germanScore < 0.2) {
      hasAmbiguity = true;
      flagLowGerman = true; // Zeichen sprechen gegen Deutsch
    }

    if (originalConfidence < 0.6) {
      issues.push('Niedrige STT-Konfidenz');
      hasAmbiguity = true;
    }

    for (const pattern of this.nonsensePatterns) {
      if (pattern.test(normalizedTranscript)) {
        issues.push('Ungewöhnliches Muster erkannt');
        isValid = false;
        break;
      }
    }

    const meaningfulWords = words.filter(word =>
      !this.germanStopWords.has(word) && word.length >= 3
    );

    if (meaningfulWords.length < this.minMeaningfulWords) {
      hasAmbiguity = true;
      flagFewMeaningful = true;
      if (meaningfulWords.length === 0) {
        isValid = false;
      }
    }

    const endsWithPunctuation = /[.!?]$/.test(transcript.trim());
    const hasVerb = this.hasLikelyVerb(words);

    if (!endsWithPunctuation && words.length > 3) {
      hasAmbiguity = true; // aber kein eigener Flag nötig
    }

    if (!hasVerb && words.length > 2) {
      hasAmbiguity = true;
      flagNoVerb = true;
    }

    if (germanScore < 0.15) {
      hasAmbiguity = true;
      flagLowGerman = true;
    }

    // Vereinheitlichte Klarstellungsnachricht für typische Verständnis-Probleme
    const needsUnifiedClarification = (flagLowGerman || flagNoVerb || flagFewMeaningful || flagNoise) && !clarificationQuestion;

    if ((hasAmbiguity && originalConfidence < 0.7) || !isValid || needsUnifiedClarification) {
      clarificationNeeded = true;
      if (foreignIndicators >= 2 && germanScore < 0.2 && clarificationQuestion) {
        // Fremdsprachenfall behält eigene Frage
      } else {
        // Einheitliche Standardnachfrage
        clarificationQuestion = `Ich konnte Sie nicht richtig verstehen. Haben Sie "${transcript}" gesagt? Bitte sprechen Sie noch einmal deutlicher.`;
      }
    }

    // Berechnung der Confidence
    let validationConfidence = originalConfidence;
    if (issues.length > 0) {
      validationConfidence *= (1 - (issues.length * 0.12));
    }
    if (germanScore >= 0.4) {
      validationConfidence += 0.05;
    }
    if (meaningfulWords.length >= 3) {
      validationConfidence += 0.05;
    }
    validationConfidence = Math.max(0, Math.min(1, validationConfidence));

    // Detaillierte Issues für vereinheitlichte Klarstellung ausblenden
    let finalIssues: string[] | undefined = issues; // allow undefined
    if (needsUnifiedClarification) {
      finalIssues = undefined;
    }
    return {
      isValid: isValid && !clarificationNeeded,
      confidence: validationConfidence,
      hasAmbiguity,
      clarificationNeeded,
      clarificationQuestion,
      issues: finalIssues
    };
  }

  async validate(
    transcript: string,
    originalConfidence: number,
    useServer: boolean = false,
    context?: { location?: string; userId?: string; previousInputs?: string[] }
  ): Promise<ValidationResult> {
    // Server validation currently disabled; fallback to local heuristics
    return this.validateLocally(transcript, originalConfidence);
  }
}
