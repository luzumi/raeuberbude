import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { SpeechRecorderService } from './speech-recorder.service';
import { SpeechTranscriptionService } from './speech-transcription.service';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';
import { SettingsService } from './settings.service';

export interface LLMTestConfig {
  url: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topK?: number;
  topP?: number;
  repeatPenalty?: number;
  minPSampling?: number;
  systemPrompt?: string;
}

export interface TestResult {
  // STT Metriken
  transcript: string;
  sttConfidence: number;
  sttDurationMs: number;
  sttProvider: string;

  // LLM Metriken
  llmResult: any;
  llmDurationMs: number;
  llmConfidence?: number;
  llmModel: string;

  // Intent & Kategorie
  intent?: any;
  category?: string;

  // Gesamtstatistik
  totalDurationMs: number;

  // Audio-Daten für optional Speicherung
  audioBlob?: Blob;
  audioMimeType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LlmTestService {
  private readonly backendUrl: string;

  constructor(
    private readonly http: HttpClient,
    private readonly recorder: SpeechRecorderService,
    private readonly transcription: SpeechTranscriptionService,
    private readonly settings: SettingsService
  ) {
    this.backendUrl = resolveBackendBase(
      environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001'
    );
  }

  // helper to safely extract error fields for logging without assuming shape
  private formatErrorForLog(err: unknown): { message: string; body: string; status?: number } {
    try {
      if (err == null) return { message: String(err), body: '' };
      // If it's an Error-like object
      if (typeof err === 'object') {
        const eAny = err as any;
        const message = typeof eAny.message === 'string' ? eAny.message : JSON.stringify(eAny);
        let body = '';
        if (typeof eAny.body === 'string') body = eAny.body;
        else if (eAny.body !== undefined) body = JSON.stringify(eAny.body);
        const status = typeof eAny.status === 'number' ? eAny.status : undefined;
        return { message, body, status };
      }
      // primitives
      return { message: String(err), body: '' };
    } catch (e) {
      return { message: 'Error formatting error for log', body: '' };
    }
  }

  /**
   * Führt einen vollständigen Test durch:
   * 1. Audio-Aufnahme via Mikrofon
   * 2. STT-Transkription
   * 3. LLM-Analyse mit konfigurierten Parametern
   */
  async runTest(config: LLMTestConfig, maxRecordingMs: number = 30000): Promise<TestResult> {
    const testStartTime = performance.now();

    // Schritt 1: Audio aufnehmen
    console.log('[LLMTest] Starting recording...');
    const recordingPromise = this.recorder.startRecording({ maxDurationMs: maxRecordingMs });

    // Warte auf Recording-Start
    await recordingPromise;
    console.log('[LLMTest] Recording started, waiting for completion...');

    // Warten auf Recording-Ende (wird automatisch nach maxRecordingMs gestoppt)
    const recordingResult = await this.waitForRecordingEnd(maxRecordingMs + 5000);

    // Schritt 2: STT-Transkription
    console.log('[LLMTest] Transcribing audio...');
    const sttStartTime = performance.now();
    const transcriptionResult = await this.transcription.transcribe({
      audioBlob: recordingResult.audioBlob,
      mimeType: recordingResult.mimeType,
      language: 'de-DE'
    });
    const sttDurationMs = Math.round(performance.now() - sttStartTime);

    if (!transcriptionResult.transcript) {
      throw new Error('Transkription fehlgeschlagen: Kein Transkript erhalten');
    }

    console.log('[LLMTest] Transcript:', transcriptionResult.transcript);

    // Schritt 3: LLM-Analyse
    console.log('[LLMTest] Analyzing with LLM...');
    const llmStartTime = performance.now();
    const llmResult = await this.analyzeWithLLM(transcriptionResult.transcript, config);
    const llmDurationMs = Math.round(performance.now() - llmStartTime);

    const totalDurationMs = Math.round(performance.now() - testStartTime);

    return {
      transcript: transcriptionResult.transcript,
      sttConfidence: transcriptionResult.confidence || 0,
      sttDurationMs,
      sttProvider: transcriptionResult.provider || 'unknown',

      llmResult: llmResult.result,
      llmDurationMs,
      llmConfidence: llmResult.confidence,
      llmModel: config.model,

      intent: llmResult.intent,
      category: llmResult.category,

      totalDurationMs,

      audioBlob: recordingResult.audioBlob,
      audioMimeType: recordingResult.mimeType
    };
  }

  /**
   * Wartet auf das Ende der Aufnahme
   * Die Aufnahme wird automatisch gestoppt durch den Timer im SpeechRecorderService
   */
  private async waitForRecordingEnd(timeoutMs: number): Promise<{ audioBlob: Blob; mimeType: string; durationMs: number }> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const subscription = this.recorder.isRecording$.subscribe(async (isRecording) => {
        // Wenn die Aufnahme gestoppt wurde (durch Timeout oder manuell)
        if (!isRecording && !resolved) {
          resolved = true;
          subscription.unsubscribe();

          console.log('[LLMTest] Recording ended, retrieving result...');

          // Kleine Verzögerung, um sicherzustellen, dass onstop abgeschlossen ist
          await new Promise(r => setTimeout(r, 100));

          // Hole das letzte Recording-Ergebnis
          const result = this.recorder.getLastRecordingResult();

          if (result) {
            console.log('[LLMTest] Successfully retrieved recording result');
            resolve(result);
          } else {
            // Fallback: Versuche stopRecording (falls noch nicht gestoppt)
            try {
              const stopResult = await this.recorder.stopRecording();
              resolve(stopResult);
            } catch (error: any) {
              console.error('[LLMTest] Failed to get recording result:', error);
              reject(new Error('Recording completed but result not available'));
            }
          }
        }
      });

      // Timeout als Sicherheit
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          reject(new Error('Recording timeout - exceeded maximum wait time'));
        }
      }, timeoutMs);
    });
  }

  /**
   * Analysiert Transkript mit LLM
   */
  private async analyzeWithLLM(transcript: string, config: LLMTestConfig): Promise<{
    result: any;
    confidence?: number;
    intent?: any;
    category?: string;
  }> {
    // Helper to actually post and return response (or throw) - improved error details
    const doPost = async (url: string, payload: any) => {
      const payloadType = payload && payload.messages
        ? `messages(${payload.messages.length} msgs)`
        : (payload.input ? 'input' : (payload.text ? 'text' : 'unknown'));

      console.log('[LLMTest] 📤 POST ->', url);
      console.log('[LLMTest] 📦 Payload type:', payloadType);
      console.log('[LLMTest] 📦 Payload keys:', Object.keys(payload || {}));
      console.log('[LLMTest] 📦 Full payload:', JSON.stringify(payload, null, 2));

      try {
        const resp = await lastValueFrom(this.http.post<any>(url, payload, { headers: { 'Content-Type': 'application/json' } }));
        console.log('[LLMTest] ✅ Response received from', url, ':', resp);
        return resp;
      } catch (err: any) {
        // Normalize network/HTTP errors and include body if present
        const status = err?.status;
        const statusText = err?.statusText;
        const body = err?.error;
        console.error('[LLMTest] ❌ HTTP error posting to', url, { status, statusText, body });
        // Throw enriched error so callers can inspect
        const message = `HTTP ${status || 'ERR'} ${statusText || ''} - ${typeof body === 'string' ? body : JSON.stringify(body)}`;
        const e = new Error(message);
        // attach raw for further logic
        (e as any).status = status;
        (e as any).body = body;
        throw e;
      }
    };

    try {
      // System-Prompt für Intent-Erkennung
      // priorisiere: 1) test-config.systemPrompt (ausgewählte Instanz) 2) runtime settings.systemPrompt 3) default
      const runtimeCfg = this.settings?.current || null;
      const systemPrompt = config.systemPrompt || runtimeCfg?.systemPrompt || `Du bist ein Assistent zur Intent-Erkennung für Smart Home Steuerung.
Analysiere die Benutzereingabe und erkenne den Intent.

Mögliche Intents:
- home_assistant_command: Befehle wie "Licht an", "Heizung runter"
- home_assistant_query: Statusabfragen wie "Ist das Licht an?"
- navigation: Navigation zu Seiten
- web_search: Web-Suche
- greeting: Begrüßungen
- general_question: Allgemeine Fragen

Antworte im JSON-Format:
{
  "intent": "intent_name",
  "category": "kategorie",
  "confidence": 0.95,
  "entities": {}
}`;

      // Fallback model/url: prefer test-config (selected instance) first, then runtime settings (loaded instance), then environment
      const effectiveModel = config.model || runtimeCfg?.model || (environment.llm && (environment.llm as any).model) || 'unknown-model';
      const effectiveUrl = (config.url || runtimeCfg?.url || (environment.llm && (environment.llm as any).url) || '').replace(/\/$/, '');

      console.log('[LLMTest] 🎯 Configuration priority check:');
      console.log('[LLMTest]   - config.model (selected instance):', config.model);
      console.log('[LLMTest]   - runtimeCfg.model (loaded instance):', runtimeCfg?.model);
      console.log('[LLMTest]   - config.url (selected instance):', config.url);
      console.log('[LLMTest]   - runtimeCfg.url (loaded instance):', runtimeCfg?.url);
      console.log('[LLMTest] ✅ Using effective model:', effectiveModel, 'Effective base URL:', effectiveUrl);

       // Build a robust payload with as many relevant settings as available.
       // We'll include both common snake_case and camelCase variants to improve
       // compatibility with different LLM frontends (LM Studio, OpenAI-style, etc.).
       const buildChatPayload = (includeSystem = true) => {
         const p: any = { model: effectiveModel, messages: [] };

         if (includeSystem) {
           p.messages.push({ role: 'system', content: systemPrompt });
           p.messages.push({ role: 'user', content: transcript });
         } else {
           // For models that don't support system role, include it as prefix to user message
           p.messages.push({ role: 'user', content: `${systemPrompt}\n\n${transcript}` });
         }

         // Standard OpenAI-like fields
         if (config.temperature != null) p.temperature = config.temperature;
         if (config.maxTokens != null) p.max_tokens = config.maxTokens;

         // Add both snake_case and camelCase variants where useful
         if (config.topK !== undefined) { p.top_k = config.topK; p.topK = config.topK; p.topk = config.topK; }
         if (config.topP !== undefined) { p.top_p = config.topP; p.topP = config.topP; p.topp = config.topP; }
         if (config.repeatPenalty !== undefined) { p.repeat_penalty = config.repeatPenalty; p.repeatPenalty = config.repeatPenalty; }
         if (config.minPSampling !== undefined) { p.min_p = config.minPSampling; p.minPSampling = config.minPSampling; }

         return p;
       };

      const messagesPayload = buildChatPayload(true);
      const messagesUserOnly = buildChatPayload(false);

      // Also provide classic completions-style 'prompt' payload (some LM endpoints require `prompt`)
      const promptWithSystem = `${systemPrompt}\n${transcript}`;
      const promptPayload: any = { model: effectiveModel, prompt: promptWithSystem };
      const promptTextPayload: any = { model: effectiveModel, prompt: promptWithSystem };

      // Simple payloads: include systemPrompt as prefix to the user input so servers
      // that only support a single text field still receive the system instructions.
      const inputPayload: any = { model: effectiveModel, input: promptWithSystem };
      const textPayload: any = { model: effectiveModel, text: promptWithSystem };

      if (config.temperature != null) { inputPayload.temperature = config.temperature; textPayload.temperature = config.temperature; promptPayload.temperature = config.temperature; promptTextPayload.temperature = config.temperature; }
      if (config.maxTokens != null) { inputPayload.max_tokens = config.maxTokens; textPayload.max_tokens = config.maxTokens; promptPayload.max_tokens = config.maxTokens; promptTextPayload.max_tokens = config.maxTokens; }
      if (config.topK !== undefined) { inputPayload.top_k = config.topK; inputPayload.topK = config.topK; promptPayload.top_k = config.topK; }
      if (config.topP !== undefined) { inputPayload.top_p = config.topP; inputPayload.topP = config.topP; promptPayload.top_p = config.topP; }

      // Try user-only first (avoid 'system' role which some LM Studio templates don't accept),
      // then system+user. Also include prompt/input/text variants to support /v1/completions endpoints.
      // Ordering: prefer messages (user-only) -> messages (system+user) -> prompt/input/text
      const payloadVariants = [messagesUserOnly, messagesPayload, promptPayload, inputPayload, textPayload, promptTextPayload];

      // Build candidate URLs to try - ONLY valid LM Studio endpoints
      const candidates: string[] = [];
      let base = effectiveUrl || '';
      base = base.replace(/\/$/, '');

      // Determine if provided URL looks like a host-only (no path)
      let hasPath = false;
      try {
        const u = new URL(base);
        hasPath = u.pathname.length > 0 && u.pathname !== '/';
      } catch (e) {
        // not a full URL, treat as having no path
        hasPath = base.includes('/') && !base.match(/^https?:?$/i);
      }

      // ONLY use valid LM Studio endpoints (remove invalid ones like /api/v1/generate, /v1/generate, etc.)
      const commonSuffixes = ['/v1/chat/completions', '/v1/completions'];

      if (hasPath) {
        // If user supplied a URL with a path, try it first, then other valid ones
        candidates.push(base);
        for (const s of commonSuffixes) {
          const candidate = base + s;
          if (!candidates.includes(candidate)) candidates.push(candidate);
        }
      } else {
        // Host-only: try valid LM Studio endpoints first
        for (const s of commonSuffixes) {
          candidates.push(base + s);
        }
      }

      // If we have a specific model name, also try engine-style path
      try {
        if (effectiveModel && effectiveModel.length > 0) {
          const engineModelId = encodeURIComponent(effectiveModel.replace('/', '__'));
          const engineCandidate = base + `/v1/engines/${engineModelId}/completions`;
          if (!candidates.includes(engineCandidate)) candidates.push(engineCandidate);
          const engineChatCandidate = base + `/v1/engines/${engineModelId}/chat/completions`;
          if (!candidates.includes(engineChatCandidate)) candidates.push(engineChatCandidate);
        }
      } catch (e) {
        // ignore any encoding issues
      }

      console.log('[LLMTest] Candidate LLM URLs to try:', candidates);

      let lastError: any = null;
      let response: any = null;

      // For each URL try several payload variants
      for (const url of candidates) {
        // For completions-style endpoints prefer 'prompt' variants first
        const isCompletions = /\/v1\/completions$/.test(url) || /\/v1\/engines\/.+\/completions$/.test(url);

        // Restrict which payload shapes we will try on which endpoint to avoid
        // sending incompatible payloads (which causes LM Studio to reply "'messages' field is required").
        let orderedPayloads = payloadVariants;
        if (/\/v1\/chat\/completions$/.test(url)) {
          // chat endpoints expect `messages` arrays -> only try message-like payloads
          orderedPayloads = payloadVariants.filter(p => p && Array.isArray(p.messages));
        } else if (isCompletions) {
          // completions endpoints expect `prompt`/`input`/`text`
          orderedPayloads = payloadVariants.filter(p => p && (p.prompt || p.input || p.text));
        } else {
          // default: try message-style first (chat-friendly), then prompt-style
          orderedPayloads = payloadVariants;
        }

        // If filtering removed everything, fall back to trying all variants
        if (!orderedPayloads || orderedPayloads.length === 0) orderedPayloads = payloadVariants;

        for (const payload of orderedPayloads) {
          try {
            let payloadType = 'text';
            if (payload === messagesPayload) payloadType = 'messages(system+user)';
            else if (payload === messagesUserOnly) payloadType = 'messages(user)';
            else if (payload && payload.prompt) payloadType = 'prompt';
            else if (payload === inputPayload) payloadType = 'input';

            // Extra debug: log model field that will be sent in this payload
            const modelInPayload = (payload && (payload.model || payload.model_name || payload.engine)) || '<<none>>';
            console.log('[LLMTest] 🔄 Trying LLM URL:', url, 'with payload type:', payloadType, 'payload.model:', modelInPayload);
            const resp = await doPost(url, payload);


            // If server explicitly returns an error payload, treat as failed attempt
            if (resp?.error) {
              lastError = new Error(resp.error || 'LLM returned error');
              console.warn('[LLMTest] LLM returned error object from', url, ':', resp.error);
              // include body details if present
              if (resp?.error && typeof resp.error === 'string') {
                console.warn('[LLMTest] LLM error body:', resp.error);
              }
              // try next payload/url
              continue;
            }

            // If it looks like an OpenAI-style response with choices, accept it
            if (resp?.choices && resp.choices.length > 0) {
              response = resp;
              console.log('[LLMTest] Accepted response from', url);
              break; // got a usable response
            }

            // If server returned 200 but not choices, might still have useful fields
            if (resp?.result || resp?.output || typeof resp === 'string') {
              response = resp;
              console.log('[LLMTest] Accepted non-choices response from', url);
              break;
            }

            // Otherwise treat as non usable and try next
            lastError = new Error('Unexpected LLM response shape from ' + url + ' (payload variant)');
            console.warn('[LLMTest] Unexpected response shape from', url, resp);
          } catch (err: unknown) {
            lastError = err as any;
            // If server provided an error body, include it in the log for debugging
            const ferr = this.formatErrorForLog(err);
            console.warn('[LLMTest] Request to', url, 'with payload variant failed, trying next. Error:', ferr.message, 'status:', ferr.status, 'body:', ferr.body);

            // Special-case: LM Studio Jinja/template rendering issues. Those
            // often indicate the model's prompt template expects variables that
            // aren't present. Try a minimal fallback: send only the user message
            // (no system prompt) as `messages: [{role:'user', content: transcript}]`.
            const bodyString = ferr.body || JSON.stringify({});
            if (bodyString && /jinja|prompt template|Cannot perform operation|Only user and assistant roles are supported/i.test(bodyString)) {
              try {
                const minimalPayload = { model: effectiveModel, messages: [{ role: 'user', content: transcript }] };
                console.log('[LLMTest] Detected LM Studio Jinja/template error - retrying with minimal user-only payload');
                const minimalResp = await doPost(url, minimalPayload);
                if (minimalResp?.choices && minimalResp.choices.length > 0) {
                  response = minimalResp;
                  lastError = null;
                  break;
                }
                // Accept other shapes too
                if (minimalResp?.result || minimalResp?.output || typeof minimalResp === 'string') {
                  response = minimalResp;
                  lastError = null;
                  break;
                }
              } catch (fallbackErr: unknown) {
                const ff = this.formatErrorForLog(fallbackErr);
                console.warn('[LLMTest] Minimal fallback also failed:', ff.message, 'body:', ff.body);
                // continue to next payload variant
              }
            }

            // continue to next payload variant
            continue;
          }
        }

        if (response) break; // stop trying more URLs
      }

      if (!response) {
        // If lastError contains server body with jinja/template issues, surface it
        throw lastError || new Error('No response from LLM');
      }

      // Handle explicit error
      if (response && response.error) {
        throw new Error(response.error || JSON.stringify(response));
      }

      // Parse OpenAI/LM-studio style choices
      if (response?.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content || response.choices[0].text || '';

        try {
          const parsed = JSON.parse(content);
          return {
            result: parsed,
            confidence: parsed.confidence,
            intent: { intent: parsed.intent, entities: parsed.entities },
            category: parsed.category
          };
        } catch (parseError) {
          console.warn('[LLMTest] Could not parse JSON response:', parseError);
          return {
            result: content,
            confidence: undefined,
            intent: undefined,
            category: undefined
          };
        }
      }

      // Try other shapes
      if (response?.result || response?.output) {
        const text = response.result || response.output;
        return { result: text, confidence: undefined, intent: undefined, category: undefined };
      }

      if (typeof response === 'string') {
        return { result: response, confidence: undefined, intent: undefined, category: undefined };
      }

      throw new Error('Keine gültige LLM-Antwort erhalten');
    } catch (error: any) {
      console.error('[LLMTest] LLM analysis failed:', error);
      throw new Error('LLM-Analyse fehlgeschlagen: ' + (error.message || String(error)));
    }
  }

  /**
   * Speichert Test-Input in der Datenbank für spätere Wiederverwendung
   */
  async saveTestInput(
    transcript: string,
    audioBlob: Blob,
    mimeType: string,
    metadata?: any
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Audio als Base64 konvertieren
      const base64Audio = await this.blobToBase64(audioBlob);

      const payload = {
        transcript,
        audioData: base64Audio,
        mimeType,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString()
        }
      };

      const response = await lastValueFrom(
        this.http.post<any>(`${this.backendUrl}/api/speech/test-inputs`, payload)
      );

      return {
        success: true,
        id: response.data?._id || response.id
      };
    } catch (error: any) {
      console.error('[LLMTest] Failed to save test input:', error);
      return {
        success: false,
        error: error.message || 'Speichern fehlgeschlagen'
      };
    }
  }

  /**
   * Lädt gespeicherte Test-Inputs
   */
  async loadTestInputs(): Promise<Array<{
    id: string;
    transcript: string;
    audioData: string;
    mimeType: string;
    metadata: any;
  }>> {
    try {
      const response = await lastValueFrom(
        this.http.get<any>(`${this.backendUrl}/api/speech/test-inputs`)
      );

      return response.data || [];
    } catch (error) {
      console.error('[LLMTest] Failed to load test inputs:', error);
      return [];
    }
  }

  /**
   * Testet mit einem gespeicherten Test-Input
   */
  async runTestWithSavedInput(
    testInputId: string,
    config: LLMTestConfig
  ): Promise<TestResult> {
    const testStartTime = performance.now();

    // Test-Input laden
    const testInputs = await this.loadTestInputs();
    const testInput = testInputs.find(ti => ti.id === testInputId);

    if (!testInput) {
      throw new Error('Test-Input nicht gefunden');
    }

    console.log('[LLMTest] Using saved test input:', testInput.transcript);

    // Direkt zur LLM-Analyse springen (STT bereits vorhanden)
    const llmStartTime = performance.now();
    const llmResult = await this.analyzeWithLLM(testInput.transcript, config);
    const llmDurationMs = Math.round(performance.now() - llmStartTime);

    const totalDurationMs = Math.round(performance.now() - testStartTime);

    return {
      transcript: testInput.transcript,
      sttConfidence: 1, // Gespeicherte Inputs haben "perfekte" Confidence
      sttDurationMs: 0, // Keine neue STT-Verarbeitung
      sttProvider: 'saved',

      llmResult: llmResult.result,
      llmDurationMs,
      llmConfidence: llmResult.confidence,
      llmModel: config.model,

      intent: llmResult.intent,
      category: llmResult.category,

      totalDurationMs
    };
  }

  /**
   * Hilfsfunktion: Blob zu Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Entferne Data-URL-Prefix
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
