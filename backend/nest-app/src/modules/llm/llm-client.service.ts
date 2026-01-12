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
 * MongoDB removed - uses hardcoded defaults.
 * TODO: Migrate to TypeORM for LLM instance configuration.
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

  private async pickInstance(instanceId?: string): Promise<LlmInstanceEntity> {
    if (instanceId) {
      const byId = await this.repo.findOne({ where: { id: instanceId, enabled: true } as any });
      if (byId) return byId;
    }

    const all = await this.repo.find({ where: { enabled: true } as any, order: { createdAt: 'DESC' } });
    if (!all.length) {
      throw new ServiceUnavailableException('Kein LLM konfiguriert. Bitte im Admin /speech-assistant ein Primary setzen.');
    }

    const primary = all.find(i => i.role === LlmRole.PRIMARY);
    if (primary) return primary;

    const secondary = all.find(i => i.role === LlmRole.SECONDARY);
    if (secondary) return secondary;

    const active = all.find(i => i.isActive);
    if (active) return active;

    return all[0];
  }

  async request(options: LlmRequestOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const instance = await this.pickInstance(options.instanceId);

    const instanceUrl = this.normalizeUrl(instance.url);

    this.logger.debug(`Using LLM instance: ${instance.model}`);

    const systemPrompt = instance.systemPrompt || undefined;
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...(options.messages || [])]
      : (options.messages || []);

    const requestBody: any = {
      model: instance.model,
      messages,
      stream: options.stream || false,
    };

    this.logger.log(`Sending request:`, {
      model: requestBody.model,
      message_count: requestBody.messages.length,
    });

    try {
      const timeout = 30000;
      const response = await lastValueFrom(
        this.http.post(instanceUrl, requestBody, {
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
    const instance = await this.pickInstance();
    return {
      model: instance.model,
      url: this.normalizeUrl(instance.url),
      config: instance.config || {},
    };
  }
}

