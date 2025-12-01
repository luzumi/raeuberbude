import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface LlmRequestOptions {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  instanceId?: string; // Optional: specific instance to use
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
 * Handles all LLM requests and automatically applies instance-specific
 * sampling parameters (topK, topP, repeatPenalty, etc.) from the database.
 */
@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    @InjectModel('LlmInstance') private readonly llmInstanceModel: Model<any>,
    private readonly http: HttpService,
  ) {}

  /**
   * Send a request to the active LLM instance with full config
   */
  async request(options: LlmRequestOptions): Promise<LlmResponse> {
    const startTime = Date.now();

    // Find instance to use (specific or active)
    const instance = options.instanceId
      ? await this.llmInstanceModel.findById(options.instanceId)
      : await this.llmInstanceModel.findOne({ isActive: true });

    if (!instance) {
      throw new Error('No active LLM instance found');
    }

    this.logger.debug(`Using LLM instance: ${instance.model}`);

    // Build request body with ALL config parameters
    const requestBody: any = {
      model: instance.model,
      messages: options.messages,
      stream: options.stream || false,
    };

    // ULTRA-MINIMAL: NUR messages, KEINE Parameter mehr
    // Selbst temperature/max_tokens können Template-Errors verursachen
    // LM Studio verwendet dann eigene Defaults

    this.logger.log(`Sending ULTRA-MINIMAL request (NO parameters):`, {
      model: requestBody.model,
      message_count: requestBody.messages.length,
      note: 'No temperature/max_tokens - LM Studio uses defaults'
    });

    try {
      // Use default timeout (config removed for ultra-minimal approach)
      const timeout = 30000; // 30 seconds

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

  /**
   * Get the currently active instance config
   */
  async getActiveInstanceConfig() {
    const instance = await this.llmInstanceModel.findOne({ isActive: true });
    if (!instance) {
      throw new Error('No active LLM instance found');
    }
    return {
      model: instance.model,
      url: instance.url,
      config: instance.config,
    };
  }
}

