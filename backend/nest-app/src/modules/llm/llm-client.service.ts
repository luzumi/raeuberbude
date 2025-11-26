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

    // Apply instance config (with defaults)
    // WICHTIG: Immer ALLE Parameter senden, damit LM Studio sie erhält!
    const config = instance.config || {};

    // Basic parameters (IMMER senden)
    requestBody.temperature = config.temperature ?? 0.3;
    requestBody.max_tokens = config.maxTokens ?? 500;

    // LM-Studio specific sampling parameters (IMMER senden mit Defaults)
    requestBody.top_k = config.topK ?? 40;
    requestBody.top_p = config.topP ?? 0.95;
    requestBody.repeat_penalty = config.repeatPenalty ?? 1.1;
    requestBody.min_p = config.minPSampling ?? 0.05;

    // LM-Studio specific performance parameters (nur wenn explizit gesetzt)
    if (config.contextLength !== undefined) requestBody.n_ctx = config.contextLength;
    if (config.evalBatchSize !== undefined) requestBody.n_batch = config.evalBatchSize;
    if (config.cpuThreads !== undefined) requestBody.n_threads = config.cpuThreads;
    if (config.gpuOffload !== undefined) requestBody.n_gpu_layers = config.gpuOffload ? -1 : 0;
    if (config.keepModelInMemory !== undefined) requestBody.cache_prompt = config.keepModelInMemory;
    if (config.flashAttention !== undefined) requestBody.flash_attn = config.flashAttention;

    this.logger.log(`Sending request to LM Studio with parameters:`, {
      model: requestBody.model,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
      top_k: requestBody.top_k,
      top_p: requestBody.top_p,
      repeat_penalty: requestBody.repeat_penalty,
      min_p: requestBody.min_p,
      n_ctx: requestBody.n_ctx,
      n_batch: requestBody.n_batch,
      n_threads: requestBody.n_threads,
    });

    try {
      const timeout = config.timeoutMs || 30000;

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

