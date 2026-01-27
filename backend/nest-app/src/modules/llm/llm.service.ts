import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ValidateIntentDto } from './dto/validate-intent.dto';

export interface IntentRecognitionResult {
  intent: string;
  confidence: number;
  originalTranscript: string;
  summary: string;
  keywords: string[];
  homeAssistant?: {
    action: string;
    entityType: string;
    location?: string;
  };
  navigation?: {
    target: string;
  };
  webSearch?: {
    query: string;
    searchType: string;
  };
}

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

interface LMStudioMessage {
  role: string;
  content: string;
}

interface LMStudioRequest {
  model: string;
  messages: LMStudioMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly llmUrl: string;
  private readonly llmModel: string;
  private readonly llmTimeout: number;
  private readonly llmEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.llmUrl = this.configService.get<string>('LLM_URL', 'http://127.0.0.1:1234/v1/chat/completions');
    this.llmModel = this.configService.get<string>('LLM_MODEL', 'mistralai/mistral-7b-instruct-v0.3');
    this.llmTimeout = this.configService.get<number>('LLM_TIMEOUT_MS', 10000);
    this.llmEnabled = this.configService.get<boolean>('LLM_ENABLED', true);

    this.logger.log(`LLM Service initialized - URL: ${this.llmUrl}, Model: ${this.llmModel}, Timeout: ${this.llmTimeout}ms`);
  }

  /**
   * Validate transcript and recognize intent using LLM
   */
  async validateIntent(dto: ValidateIntentDto): Promise<ValidationResult> {
    const startTime = Date.now();

    // Quick validation
    if (!dto.transcript || dto.transcript.trim().length < 2) {
      return {
        isValid: false,
        confidence: 0,
        hasAmbiguity: true,
        clarificationNeeded: true,
        clarificationQuestion: 'Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.',
        issues: ['Transcript too short']
      };
    }

    if (!this.llmEnabled) {
      this.logger.warn('LLM is disabled, using fallback validation');
      return this.fallbackValidation(dto.transcript, dto.confidence);
    }

    try {
      const result = await this.callLLMForValidation(dto.transcript, dto.confidence, {
        location: dto.location,
        userId: dto.userId,
        previousInputs: dto.previousInputs
      });

      const duration = Date.now() - startTime;
      this.logger.log(`LLM validation completed in ${duration}ms - Valid: ${result.isValid}, Intent: ${result.intent?.intent}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`LLM validation failed after ${duration}ms: ${error.message}`);
      
      // Fallback to simple validation
      return this.fallbackValidation(dto.transcript, dto.confidence);
    }
  }

  /**
   * Call LM Studio API for validation and intent recognition
   */
  private async callLLMForValidation(
    transcript: string,
    originalConfidence: number,
    context?: { location?: string; userId?: string; previousInputs?: string[] }
  ): Promise<ValidationResult> {
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

2. home_assistant_query: Abfragen über Smart Home Status
   - "Ist das Licht an?" → action=query, entityType=light

3. navigation: App-Navigation
   - "Zeige mir den Samsung TV" → target=samsung-tv

4. web_search: Internet-Anfragen
   - "Wie hat Werder Bremen heute gespielt?" → query="Werder Bremen Spielergebnis heute", searchType=sports
   - "Wetter morgen" → query="Wetter morgen", searchType=weather

5. greeting: Begrüßungen
   - "Hallo", "Guten Morgen"

6. general_question: Allgemeine Fragen
   - "Wie spät ist es?"

7. unknown: Unklare Eingaben`;

    const userPrompt = `STT-Confidence: ${(originalConfidence * 100).toFixed(0)}%
Transkript: "${transcript}"

Validiere diese Spracheingabe.`;

    // Mistral supports only user/assistant roles - combine system prompt
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    const request: LMStudioRequest = {
      model: this.llmModel,
      messages: [{ role: 'user', content: combinedPrompt }],
      temperature: 0.3,
      max_tokens: 500,
      stream: false
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<LMStudioResponse>(this.llmUrl, request, {
          timeout: this.llmTimeout,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty LLM response');
      }

      // Parse JSON from LLM response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('LLM response not JSON format:', content);
        throw new Error('Invalid LLM response format');
      }

      const llmResult = JSON.parse(jsonMatch[0]);

      // Parse intent recognition
      let intent: IntentRecognitionResult | undefined;
      if (llmResult.intent) {
        intent = {
          intent: llmResult.intent.type || 'unknown',
          confidence: typeof llmResult.confidence === 'number' ? llmResult.confidence : originalConfidence,
          originalTranscript: transcript,
          summary: llmResult.intent.summary || transcript,
          keywords: Array.isArray(llmResult.intent.keywords) ? llmResult.intent.keywords : [],
          homeAssistant: llmResult.intent.homeAssistant || undefined,
          navigation: llmResult.intent.navigation || undefined,
          webSearch: llmResult.intent.webSearch || undefined
        };
      }

      return {
        isValid: llmResult.isValid === true,
        confidence: typeof llmResult.confidence === 'number' ? llmResult.confidence : originalConfidence,
        hasAmbiguity: llmResult.hasAmbiguity === true,
        clarificationNeeded: llmResult.clarificationNeeded === true,
        clarificationQuestion: llmResult.clarificationQuestion || undefined,
        suggestions: Array.isArray(llmResult.suggestions) ? llmResult.suggestions : undefined,
        issues: undefined,
        intent
      };
    } catch (error: any) {
      // Check for timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        this.logger.warn(`LLM request timeout after ${this.llmTimeout}ms`);
        throw new HttpException('LLM request timeout', HttpStatus.GATEWAY_TIMEOUT);
      }

      // Check for connection errors
      if (error.code === 'ECONNREFUSED' || error.response?.status === 0) {
        this.logger.warn('LM Studio not reachable at', this.llmUrl);
        throw new HttpException('LM Studio not available', HttpStatus.SERVICE_UNAVAILABLE);
      }

      throw error;
    }
  }

  /**
   * Fallback validation when LLM is unavailable
   */
  private fallbackValidation(transcript: string, originalConfidence: number): ValidationResult {
    this.logger.debug('Using fallback validation');

    return {
      isValid: true,
      confidence: originalConfidence * 0.7,
      hasAmbiguity: true,
      clarificationNeeded: false,
      issues: ['LLM nicht erreichbar - Fallback verwendet']
    };
  }

  /**
   * Check if LLM service is available
   */
  async checkHealth(): Promise<{ available: boolean; url: string; model: string }> {
    if (!this.llmEnabled) {
      return {
        available: false,
        url: this.llmUrl,
        model: this.llmModel
      };
    }

    try {
      // Try a simple health check
      const response = await firstValueFrom(
        this.httpService.get(`${this.llmUrl.replace('/v1/chat/completions', '')}/v1/models`, {
          timeout: 2000
        })
      );

      return {
        available: response.status === 200,
        url: this.llmUrl,
        model: this.llmModel
      };
    } catch {
      return {
        available: false,
        url: this.llmUrl,
        model: this.llmModel
      };
    }
  }
}
