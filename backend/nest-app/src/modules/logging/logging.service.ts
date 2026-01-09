import { Injectable, Logger } from '@nestjs/common';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';
import { LlmClientService } from '../llm/llm-client.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmHealth, LlmInstanceEntity } from '../llm/entities/llm-instance.entity';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  private readonly DEFAULT_SYSTEM_PROMPT = `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent für ein Räuberbude-System.
Deine Aufgabe ist es, Benutzeranfragen zu verstehen und in strukturierte JSON-Aktionen zu übersetzen.`;

  constructor(
    private readonly mcpService: LmStudioMcpService,
    private readonly llmClient: LlmClientService,
    @InjectRepository(LlmInstanceEntity)
    private readonly llmRepo: Repository<LlmInstanceEntity>,
  ) {}

  // ============================================================================
  // TRANSCRIPT METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async createTranscript(data: any) {
    this.logger.warn('createTranscript() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async getTranscripts(page = 1, limit = 20, query: any = {}) {
    this.logger.warn('getTranscripts() not implemented - MongoDB removed, needs TypeORM migration');
    return { data: [], total: 0, page, limit };
  }

  async getTranscriptById(id: string) {
    this.logger.warn('getTranscriptById() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async updateTranscript(id: string, updates: any) {
    this.logger.warn('updateTranscript() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async updateManyTranscripts(ids: string[], updates: any) {
    this.logger.warn('updateManyTranscripts() not implemented - MongoDB removed, needs TypeORM migration');
    return { modifiedCount: 0 };
  }

  async getTranscriptStats() {
    this.logger.warn('getTranscriptStats() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  async getModelStats() {
    this.logger.warn('getModelStats() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  // ============================================================================
  // CATEGORY METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async getCategories() {
    this.logger.warn('getCategories() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  async createCategory(data: any) {
    this.logger.warn('createCategory() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  // ============================================================================
  // LLM INSTANCE METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async getLlmInstances() {
    // Now backed by TypeORM (MariaDB)
    return this.llmRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Scan for available LLM instances.
   * Strategy:
   *  - Always ensure a default LM Studio instance from env/config exists
   *  - Optionally query LM Studio via MCP for loaded/available models and create per-model instances
   */
  async scanLlmInstances(): Promise<LlmInstanceEntity[]> {
    const createdOrUpdated: string[] = [];

    // 1) Base URL candidates
    const baseUrlCandidates: string[] = [];

    // Prefer LM Studio URL env var (used by MCP)
    if (process.env.LM_STUDIO_URL) baseUrlCandidates.push(String(process.env.LM_STUDIO_URL));

    // Allow legacy env var compatibility
    if (process.env.LLM_URLS) {
      String(process.env.LLM_URLS)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(u => baseUrlCandidates.push(u));
    }

    // Fallback: keep current dev default (matches frontend env)
    if (baseUrlCandidates.length === 0) baseUrlCandidates.push('http://192.168.56.1:1234');

    // Normalize to chat completions endpoint (OpenAI compatible)
    const normalizeChatUrl = (u: string) => {
      const trimmed = u.trim().replace(/\/+$/, '');
      // already points to completions
      if (trimmed.includes('/chat/completions')) return trimmed;
      // if already has /v1
      if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
      // if ends with /v1/models etc, just use origin
      try {
        const url = new URL(trimmed);
        return `${url.origin}/v1/chat/completions`;
      } catch {
        return `${trimmed}/v1/chat/completions`;
      }
    };

    const chatUrls = Array.from(new Set(baseUrlCandidates)).map(normalizeChatUrl);

    // 2) Determine model ids via MCP (best effort)
    let modelIds: string[] = [];
    try {
      const models = await this.mcpService.listModels();
      if (Array.isArray(models)) {
        modelIds = models
          .map((m: any) => m?.id || m?.model || m?.name)
          .filter(Boolean);
      }
    } catch (e: any) {
      this.logger.warn(`MCP listModels failed, falling back to env model. ${e?.message || e}`);
    }

    // 3) Fallback model(s) from env
    const envModel = (process.env.LLM_MODEL || process.env.LM_STUDIO_MODEL || '').trim();
    if (modelIds.length === 0 && envModel) modelIds = [envModel];
    if (modelIds.length === 0) modelIds = ['default-model'];

    // 4) Upsert instances (url x model)
    for (const url of chatUrls) {
      for (const model of modelIds) {
        const name = `${model}`;

        let existing = await this.llmRepo.findOne({ where: { url, model } });
        if (!existing) {
          existing = this.llmRepo.create({
            name,
            url,
            model,
            enabled: true,
            isActive: false,
            systemPrompt: null,
            health: LlmHealth.UNKNOWN,
            lastHealthCheck: null,
            config: null,
          });
        } else {
          // Keep name in sync (harmless)
          existing.name = name;
          existing.enabled = existing.enabled ?? true;
        }

        await this.llmRepo.save(existing);
        createdOrUpdated.push(`${url}::${model}`);
      }
    }

    // 5) Ensure only one active as a rule (best effort)
    await this.ensureSingleActiveInstance();

    this.logger.log(`scanLlmInstances: upserted ${createdOrUpdated.length} instance(s)`);
    return this.getLlmInstances();
  }

  async ensureSingleActiveInstance() {
    const active = await this.llmRepo.find({ where: { isActive: true } });
    if (active.length <= 1) return;

    // keep the newest active, deactivate others
    const sorted = active.sort((a, b) => (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0));
    const keep = sorted[0];
    const toDeactivate = sorted.slice(1);
    for (const inst of toDeactivate) {
      inst.isActive = false;
      await this.llmRepo.save(inst);
    }
    this.logger.warn(`ensureSingleActiveInstance: deactivated ${toDeactivate.length} extra active instance(s), kept ${keep.id}`);
  }

  async ensureSyncedInstance(desiredName: string) {
    this.logger.warn('ensureSyncedInstance() not implemented - MongoDB removed');
    return null;
  }

  async getOrCreateInstance(name: string) {
    this.logger.warn('getOrCreateInstance() not implemented - MongoDB removed');
    return null;
  }

  async getActiveInstance() {
    this.logger.warn('getActiveInstance() not implemented - MongoDB removed');
    return null;
  }

  async getAllInstances() {
    this.logger.warn('getAllInstances() not implemented - MongoDB removed');
    return [];
  }

  async cleanupOldInstances() {
    // Minimal cleanup: remove disabled instances older than 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const disabledOld = await this.llmRepo
      .createQueryBuilder('i')
      .where('i.enabled = :enabled', { enabled: false })
      .andWhere('i.updated_at < :cutoff', { cutoff })
      .getMany();

    if (disabledOld.length) {
      await this.llmRepo.remove(disabledOld);
    }
    return { success: true, deleted: disabledOld.length };
  }

  async activateInstance(id: string) {
    this.logger.warn('activateInstance() not implemented - MongoDB removed');
    return null;
  }

  async updateInstance(id: string, updates: any) {
    this.logger.warn('updateInstance() not implemented - MongoDB removed');
    return null;
  }

  async deleteInstance(id: string) {
    const inst = await this.llmRepo.findOne({ where: { id } });
    if (!inst) return { success: false };
    await this.llmRepo.remove(inst);
    return { success: true, deletedInstance: inst };
  }

  async testInstance(id: string) {
    this.logger.warn('testInstance() not implemented - MongoDB removed');
    return { success: false, message: 'Not implemented' };
  }

  async updateInstanceSystemPrompt(id: string, systemPrompt: string) {
    const inst = await this.llmRepo.findOne({ where: { id } });
    if (!inst) return null;
    inst.systemPrompt = systemPrompt;
    return this.llmRepo.save(inst);
  }

  async updateInstanceSamplingParams(id: string, samplingParams: any) {
    const inst = await this.llmRepo.findOne({ where: { id } });
    if (!inst) return null;
    inst.config = {
      ...(inst.config || {}),
      ...samplingParams,
    };
    return this.llmRepo.save(inst);
  }

  // ============================================================================
  // INTENT LOG METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async createIntentLog(data: any) {
    this.logger.warn('createIntentLog() not implemented - MongoDB removed');
    return null;
  }

  async getIntentLogs(page = 1, limit = 20, query: any = {}) {
    this.logger.warn('getIntentLogs() not implemented - MongoDB removed');
    return { data: [], total: 0, page, limit };
  }

  async getIntentLogStats() {
    this.logger.warn('getIntentLogStats() not implemented - MongoDB removed');
    return [];
  }

  async getDbStats() {
    this.logger.warn('getDbStats() not implemented - MongoDB removed');
    return null;
  }

  // ============================================================================
  // AI PROCESSING METHODS - These still work with LLM client
  // ============================================================================

  async categorizeTranscript(text: string, categories: any[]): Promise<any> {
    try {
      const prompt = `Kategorisiere folgenden Text in eine der Kategorien: ${categories.map((c: any) => c.key).join(', ')}\n\nText: ${text}\n\nAntworte nur mit dem Kategorienamen.`;

      const response = await this.llmClient.request({
        messages: [{ role: 'user', content: prompt }],
      });

      const category = response.content.trim().toLowerCase();
      return categories.find((c: any) => c.key.toLowerCase() === category) || categories[0];
    } catch (error: any) {
      this.logger.error('Categorization failed:', error);
      return categories[0];
    }
  }

  async parseUserIntentNew(text: string): Promise<any> {
    try {
      const systemPrompt = this.DEFAULT_SYSTEM_PROMPT;
      const response = await this.llmClient.request({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      });

      try {
        return JSON.parse(response.content);
      } catch {
        return { error: 'Failed to parse JSON', raw: response.content };
      }
    } catch (error: any) {
      this.logger.error('Intent parsing failed:', error);
      return { error: error.message };
    }
  }

  async syncLmStudioModels() {
    this.logger.warn('syncLmStudioModels() not fully implemented - MongoDB removed');
    return [];
  }
}

