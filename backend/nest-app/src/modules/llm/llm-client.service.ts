import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface LlmRequestOptions {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  instanceId?: string;
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

/**
 * Central LLM Client Service
 *
 * MongoDB removed - uses hardcoded defaults.
 * TODO: Migrate to TypeORM for LLM instance configuration.
 */
@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  // Hardcoded default instance (TODO: Move to TypeORM)
  private readonly defaultInstance = {
    model: 'default-model',
    url: 'http://localhost:1234/v1/chat/completions',
    isActive: true,
  };

  constructor(private readonly http: HttpService) {}

  async request(options: LlmRequestOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const instance = this.defaultInstance;

    this.logger.debug(`Using LLM instance: ${instance.model}`);

    const requestBody: any = {
      model: instance.model,
      messages: options.messages,
      stream: options.stream || false,
    };

    this.logger.log(`Sending request:`, {
      model: requestBody.model,
      message_count: requestBody.messages.length,
    });

    try {
      const timeout = 30000;
      const response = await lastValueFrom(
        this.http.post(instance.url, requestBody, {
          timeout,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = response.data;
      const content = data.choices?.[0]?.message?.content || '';
      const durationMs = Date.now() - startTime;

      this.logger.log(`LLM request completed in ${durationMs}ms`);

      return {
        content,
        model: instance.model,
        usage: data.usage,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`LLM request failed after ${durationMs}ms:`, error.message);
      throw new Error(`LLM request failed: ${error.message}`);
    }
  }

  async getActiveInstanceConfig() {
    return {
      model: this.defaultInstance.model,
      url: this.defaultInstance.url,
      config: {},
    };
  }
}

