import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { IntentRecognitionResult, IntentType } from '../models/intent-recognition.model';
import { SettingsService } from './settings.service';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  issues?: string[];
  intent?: IntentRecognitionResult;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionValidatorRuntimeService {
  constructor(
    private readonly http: HttpClient,
    private readonly settings: SettingsService
  ) {}

  private getChatCompletionsUrl(): string {
    return this.settings.getChatCompletionsUrl();
  }

  private getModelCandidates(): { primary?: string; fallback?: string } {
    const cfg = this.settings.current;
    return {
      primary: String(cfg?.model || '').trim() || undefined,
      fallback: String(cfg?.fallbackModel || '').trim() || undefined
    };
  }

  private buildSystemPrompt(): string {
    return (
      this.settings.current?.systemPrompt ||
      `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent.\n` +
        `Antworte IMMER mit validem JSON ohne Markdown.\n` +
        `Schema: {"action": "home_assistant_command"|"home_assistant_query"|"home_assistant_queryautomation"|"web_search"|"greeting"|"general_question"|"unknown", "response": string, "confidence": number, "entities": string[], "parameters": object }`
    );
  }

  private normalizeIntentType(action: any): IntentType {
    const a = String(action || '').toLowerCase();
    if (a === 'home_assistant_command') return 'home_assistant_command';
    if (a === 'home_assistant_query') return 'home_assistant_query';
    if (a === 'home_assistant_queryautomation') return 'home_assistant_queryautomation';
    if (a === 'web_search') return 'web_search';
    if (a === 'greeting') return 'greeting';
    if (a === 'general_question' || a === 'general') return 'general_question';
    return 'unknown';
  }

  private toIntentResult(parsed: any, transcript: string, fallbackConfidence: number): IntentRecognitionResult {
    const intent = this.normalizeIntentType(parsed?.action);
    const confidence = typeof parsed?.confidence === 'number' ? parsed.confidence : fallbackConfidence;

    const keywords: string[] = [];
    if (Array.isArray(parsed?.entities)) {
      keywords.push(...parsed.entities.map((x: any) => String(x)).filter(Boolean));
    }

    const summary = String(parsed?.response || parsed?.manipulated_query || '').trim() || 'OK';

    const res: IntentRecognitionResult = {
      intent,
      confidence,
      originalTranscript: transcript,
      summary,
      keywords
    };

    // Minimal mapping for HA/web search if provided
    if (intent.startsWith('home_assistant') && parsed?.parameters && typeof parsed.parameters === 'object') {
      res.homeAssistant = {
        action: undefined,
        attributes: parsed.parameters
      };
    }
    if (intent === 'web_search') {
      res.webSearch = {
        query: String(parsed?.parameters?.query || transcript)
      };
    }

    return res;
  }

  private async postChatCompletion(model: string, transcript: string): Promise<{ parsed: any; raw: any }> {
    const cfg = this.settings.current;

    const payload: any = {
      model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: transcript }
      ],
      temperature: typeof cfg?.temperature === 'number' ? cfg.temperature : 0.3,
      max_tokens: typeof cfg?.maxTokens === 'number' ? cfg.maxTokens : 500,
      stream: false
    };

    const url = this.getChatCompletionsUrl();
    const resp = await lastValueFrom(this.http.post<ChatCompletionResponse>(url, payload, { headers: { 'Content-Type': 'application/json' } }));

    const content = resp?.choices?.[0]?.message?.content || '';
    const trimmed = String(content).trim();

    // Try parse JSON from model output
    let parsed: any = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // attempt to extract JSON block
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        parsed = JSON.parse(trimmed.slice(start, end + 1));
      } else {
        parsed = { action: 'unknown', response: trimmed, confidence: 0.4, entities: [], parameters: {} };
      }
    }

    return { parsed, raw: resp };
  }

  async validate(
    transcript: string,
    originalConfidence: number,
    useServer: boolean = false,
    context?: { location?: string; userId?: string; terminalId?: string }
  ): Promise<ValidationResult> {
    const t = (transcript || '').trim();
    if (!t || t.length < 2) {
      return {
        isValid: false,
        confidence: 0,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.'
      };
    }

    // Basic heuristic: low STT confidence -> ask
    if (originalConfidence < 0.6) {
      return {
        isValid: false,
        confidence: originalConfidence,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich bin mir nicht sicher. Können Sie das bitte wiederholen?',
        issues: ['Niedrige STT-Konfidenz']
      };
    }

    const candidates = this.getModelCandidates();
    const primary = candidates.primary;
    const fallback = candidates.fallback;

    if (!primary) {
      return {
        isValid: true,
        confidence: originalConfidence,
        hasAmbiguity: false,
        intent: {
          intent: 'unknown',
          confidence: originalConfidence,
          originalTranscript: t,
          summary: 'OK',
          keywords: []
        }
      };
    }

    try {
      const { parsed } = await this.postChatCompletion(primary, t);
      return {
        isValid: true,
        confidence: Math.max(originalConfidence, typeof parsed?.confidence === 'number' ? parsed.confidence : 0),
        hasAmbiguity: false,
        intent: this.toIntentResult(parsed, t, originalConfidence)
      };
    } catch (e1: any) {
      // Model not found -> retry fallback
      const msg1 = String(e1?.error?.error?.message || e1?.error?.message || e1?.message || e1);
      const isModelNotFound = msg1.toLowerCase().includes('model') && msg1.toLowerCase().includes('not');

      if (fallback && isModelNotFound) {
        try {
          const { parsed } = await this.postChatCompletion(fallback, t);
          return {
            isValid: true,
            confidence: Math.max(originalConfidence, typeof parsed?.confidence === 'number' ? parsed.confidence : 0),
            hasAmbiguity: false,
            intent: this.toIntentResult(parsed, t, originalConfidence)
          };
        } catch (e2: any) {
          const msg2 = String(e2?.error?.error?.message || e2?.error?.message || e2?.message || e2);
          throw new Error(`LLM nicht erreichbar: ${msg2}`);
        }
      }

      throw new Error(`LLM nicht erreichbar: ${msg1}`);
    }
  }
}
