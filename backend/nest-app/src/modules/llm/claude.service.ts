import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequestOptions {
  messages: LlmMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
}

export interface HaIntentResult {
  entityId: string | null;
  action: string | null;
  confidence: number;
  raw: string;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = this.config.get<string>('LLM_MODEL', 'claude-sonnet-4-6');
    this.maxTokens = this.config.get<number>('LLM_MAX_TOKENS', 500);
    this.temperature = this.config.get<number>('LLM_TEMPERATURE', 0.3);
  }

  async request(options: LlmRequestOptions): Promise<LlmResponse> {
    const startTime = Date.now();

    this.logger.debug(`Claude request: ${options.messages.length} messages, model=${this.model}`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? this.maxTokens,
      temperature: options.temperature ?? this.temperature,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: options.messages,
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('');

    const durationMs = Date.now() - startTime;
    this.logger.debug(`Claude response in ${durationMs}ms`);

    return {
      content,
      model: response.model,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      durationMs,
    };
  }

  /**
   * Erkennt die Intention aus einem Sprachtranskript und mappt sie auf eine HA-Entity und Aktion.
   *
   * @param transcript  Der transkribierte Sprachbefehl, z.B. "mach das Licht im Wohnzimmer an"
   * @param entities    Gefilterte Liste verfügbarer HA-Entities (entityId + friendlyName + domain)
   */
  async recognizeIntent(
    transcript: string,
    entities: Array<{ entityId: string; friendlyName: string; domain: string }>,
  ): Promise<HaIntentResult> {
    const entityList = entities
      .map(e => `- ${e.entityId} (${e.friendlyName}, ${e.domain})`)
      .join('\n');

    const systemPrompt = `Du bist ein Smart-Home-Assistent und wertest deutsche Sprachbefehle aus.
Dir werden verfügbare Home-Assistant-Entities gegeben. Antworte ausschließlich als kompaktes JSON-Objekt ohne Erklärung:
{"entityId": "<entity_id oder null>", "action": "<turn_on|turn_off|toggle|open|close|lock|unlock|press oder null>", "confidence": <0.0-1.0>}`;

    const userMessage = `Verfügbare Entities:\n${entityList}\n\nSprachbefehl: "${transcript}"`;

    const response = await this.request({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 100,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(response.content.trim());
      return {
        entityId: parsed.entityId ?? null,
        action: parsed.action ?? null,
        confidence: parsed.confidence ?? 0,
        raw: response.content,
      };
    } catch {
      this.logger.warn(`Intent-Parsing fehlgeschlagen: ${response.content}`);
      return { entityId: null, action: null, confidence: 0, raw: response.content };
    }
  }
}
