import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { LlmClientService } from './llm-client.service';
import { ValidateTranscriptDto } from './dto/validate-transcript.dto';

export interface ValidationResultDto {
  isValid: boolean;
  confidence: number;
  hasAmbiguity: boolean;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  issues?: string[];
  intent?: any;
  raw?: any;
  model?: string;
}

@Injectable()
export class LlmValidationService {
  private readonly logger = new Logger(LlmValidationService.name);

  private readonly fallbackSystemPrompt =
    'Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent.\n' +
    'Antworte IMMER mit validem JSON ohne Markdown.\n' +
    'Schema: {"action": "home_assistant_command"|"home_assistant_query"|"home_assistant_queryautomation"|"web_search"|"greeting"|"general_question"|"unknown", "response": string, "confidence": number, "entities": string[], "parameters": object }';

  constructor(private readonly llm: LlmClientService) {}

  async validateTranscript(dto: ValidateTranscriptDto): Promise<ValidationResultDto> {
    const t = String(dto?.transcript || '').trim();
    const sttConfidence = typeof dto?.confidence === 'number' ? dto.confidence : 0;

    if (!t || t.length < 2) {
      return {
        isValid: false,
        confidence: 0,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.',
        issues: ['Leeres oder zu kurzes Transkript'],
      };
    }

    // Basic heuristic: low STT confidence -> ask
    if (sttConfidence > 0 && sttConfidence < 0.6) {
      return {
        isValid: false,
        confidence: sttConfidence,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich bin mir nicht sicher. Können Sie das bitte wiederholen?',
        issues: ['Niedrige STT-Konfidenz'],
      };
    }

    const userPrompt = t;

    // LlmClientService injects instance.systemPrompt, but we keep a safety copy in the user-visible schema prompt.
    const messages = [
      { role: 'system', content: this.fallbackSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const resp = await this.llm.request({ messages, stream: false });
      const content = String(resp?.content || '').trim();

      const parsed = this.safeParseJson(content);
      const normalized = this.normalizeIntent(parsed, userPrompt, sttConfidence);

      return {
        isValid: true,
        confidence: normalized.confidence,
        hasAmbiguity: false,
        intent: normalized.intent,
        raw: parsed,
        model: resp.model,
      };
    } catch (e: any) {
      this.logger.warn(`validateTranscript failed: ${e?.message || e}`);
      throw new ServiceUnavailableException(`LLM nicht erreichbar: ${e?.message || String(e)}`);
    }
  }

  private safeParseJson(text: string): any {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { action: 'unknown', response: '', confidence: 0.4, entities: [], parameters: {} };

    try {
      return JSON.parse(trimmed);
    } catch {
      // attempt to extract JSON block
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1));
      }
      return { action: 'unknown', response: trimmed, confidence: 0.4, entities: [], parameters: {} };
    }
  }

  private normalizeIntent(parsed: any, transcript: string, fallbackConfidence: number): { intent: any; confidence: number } {
    const confidence = typeof parsed?.confidence === 'number' ? parsed.confidence : fallbackConfidence;
    const intent = {
      intent: String(parsed?.action || 'unknown'),
      confidence,
      originalTranscript: transcript,
      summary: String(parsed?.response || parsed?.manipulated_query || 'OK'),
      keywords: Array.isArray(parsed?.entities) ? parsed.entities.map(String).filter(Boolean) : [],
      homeAssistant: undefined as any,
      webSearch: undefined as any,
    };

    if (String(intent.intent).startsWith('home_assistant') && parsed?.parameters && typeof parsed.parameters === 'object') {
      intent.homeAssistant = { action: undefined, attributes: parsed.parameters };
    }
    if (intent.intent === 'web_search') {
      intent.webSearch = { query: String(parsed?.parameters?.query || transcript) };
    }

    return { intent, confidence: Number.isFinite(confidence) ? confidence : fallbackConfidence };
  }
}
