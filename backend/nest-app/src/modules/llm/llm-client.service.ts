import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { LlmInstanceEntity, LlmRole } from './entities/llm-instance.entity';

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
 * MongoDB removed - uses TypeORM-backed LLM instances.
 */
@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    private readonly http: HttpService,
    @InjectRepository(LlmInstanceEntity)
    private readonly repo: Repository<LlmInstanceEntity>,
  ) {}

  private normalizeUrl(url: string): string {
    const trimmed = String(url || '').trim();
    if (!trimmed) return trimmed;
    // If someone stored /v1/chat/completions, keep it as-is.
    if (trimmed.includes('/chat/completions')) return trimmed;
    return trimmed.replace(/\/+$/, '') + '/v1/chat/completions';
  }

  private selectBestInstance(all: LlmInstanceEntity[]): LlmInstanceEntity {
    const primary = all.find(i => i.role === LlmRole.PRIMARY);
    if (primary) return primary;

    const secondary = all.find(i => i.role === LlmRole.SECONDARY);
    if (secondary) return secondary;

    const active = all.find(i => i.isActive);
    if (active) return active;

    return all[0];
  }

  private async pickInstance(instanceId?: string): Promise<LlmInstanceEntity> {
    if (instanceId) {
      const byId = await this.repo.findOne({ where: { id: instanceId } as any });
      if (byId && byId.enabled !== false) return byId;
      if (byId) {
        throw new ServiceUnavailableException(
          `LLM instance ${instanceId} ist deaktiviert (enabled=false). Bitte im Admin /speech-assistant aktivieren.`,
        );
      }
    }

    // Prefer enabled=true instances.
    const enabled = await this.repo.find({ where: { enabled: true } as any, order: { createdAt: 'DESC' } });
    if (enabled.length) {
      return this.selectBestInstance(enabled);
    }

    // Fallback: if nothing is enabled, but instances exist (e.g. fresh migration / UI not toggled yet),
    // still allow requests so the system isn't hard-bricked.
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    if (!all.length) {
      throw new ServiceUnavailableException('Kein LLM konfiguriert. Bitte im Admin /speech-assistant ein Primary setzen.');
    }

    this.logger.warn(
      'No LLM instances are enabled (enabled=false for all). Falling back to role-based selection anyway. ' +
        'Consider enabling a primary in Admin /speech-assistant.',
    );

    return this.selectBestInstance(all);
  }

  /**
   * Applies generation/sampling config from the instance onto the outgoing request body.
   * Only fields that belong to /v1/chat/completions are included.
   */
  private applyGenerationOptionsIfActive(instance: LlmInstanceEntity, requestBody: any) {
    if (!instance.isActive) {
      this.logger.debug(`Instance is not active (not loaded) -> skipping sampling config in request for ${instance.model}`);
      return;
    }

    const cfg = (instance.config || {}) as any;

    // OpenAI-compatible snake_case fields
    if (cfg.temperature !== undefined) requestBody.temperature = cfg.temperature;
    if (cfg.maxTokens !== undefined) requestBody.max_tokens = cfg.maxTokens;
    if (cfg.topP !== undefined) requestBody.top_p = cfg.topP;

    // LM Studio / llama.cpp style extras (may be ignored if unsupported)
    if (cfg.topK !== undefined) requestBody.top_k = cfg.topK;
    if (cfg.repeatPenalty !== undefined) requestBody.repeat_penalty = cfg.repeatPenalty;
    if (cfg.minPSampling !== undefined) requestBody.min_p = cfg.minPSampling;

    // NOTE: Load/performance knobs are NOT request parameters for /v1/chat/completions,
    // therefore we intentionally do not send: contextLength, evalBatchSize, cpuThreads,
    // gpuOffload, keepModelInMemory, flashAttention, kCacheQuant, vCacheQuant.
  }

  private buildMessagesWithOptionalSystemPrompt(systemPrompt: string | null | undefined, messages: Array<{ role: string; content: string }>) {
    const safeMessages = messages || [];
    return systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...safeMessages]
      : safeMessages;
  }

  private async postChatCompletion(url: string, requestBody: any) {
    const timeout = 30000;
    return lastValueFrom(
      this.http.post(url, requestBody, {
        timeout,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  async request(options: LlmRequestOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const instance = await this.pickInstance(options.instanceId);

    const instanceUrl = this.normalizeUrl(instance.url);

    this.logger.debug(`Using LLM instance: ${instance.model}`);

    const messages = this.buildMessagesWithOptionalSystemPrompt(instance.systemPrompt || undefined, options.messages);

    const requestBody: any = {
      model: instance.model,
      messages,
      stream: options.stream || false,
    };

    // Requirement: if instance isn't loaded, do not try to apply per-request configs.
    this.applyGenerationOptionsIfActive(instance, requestBody);

    this.logger.log(
      `Sending request meta: ${JSON.stringify({
        model: requestBody.model,
        message_count: requestBody.messages.length,
        has_sampling_config: !!instance.isActive && !!instance.config,
      })}`,
    );

    try {
      const response = await this.postChatCompletion(instanceUrl, requestBody);

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

      const status = error?.response?.status;
      const respData = error?.response?.data;
      const respText = (() => {
        try {
          if (respData === undefined || respData === null) return '';
          return typeof respData === 'string' ? respData : JSON.stringify(respData);
        } catch {
          return '';
        }
      })();

      this.logger.error(`LLM request failed after ${durationMs}ms:`, {
        message: error?.message,
        status,
        response: respData,
      });

      const details = [
        status ? `status=${status}` : null,
        respText ? `response=${respText}` : null,
      ].filter(Boolean).join(' ');

      const suffix = details ? ` (${details})` : '';
      throw new Error(`LLM request failed: ${error.message}${suffix}`);
    }
  }
}
