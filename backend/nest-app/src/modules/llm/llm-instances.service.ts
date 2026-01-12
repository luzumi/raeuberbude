import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmInstanceEntity, LlmRole } from './entities/llm-instance.entity';
import { LmStudioMcpService } from './lm-studio-mcp.service';

@Injectable()
export class LlmInstancesService {
  private readonly logger = new Logger(LlmInstancesService.name);

  constructor(
    @InjectRepository(LlmInstanceEntity)
    private readonly repo: Repository<LlmInstanceEntity>,
    private readonly mcp: LmStudioMcpService,
  ) {}

  async list({ syncActive = false }: { syncActive?: boolean } = {}): Promise<LlmInstanceEntity[]> {
    if (syncActive) {
      await this.syncActiveFlagsFromLmStudio().catch(() => undefined);
    }
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async updateRole(id: string, role: string): Promise<LlmInstanceEntity> {
    const normalizedRole = this.normalizeRole(role);

    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);

    if (normalizedRole === LlmRole.PRIMARY || normalizedRole === LlmRole.SECONDARY) {
      await this.repo.update({ role: normalizedRole }, { role: LlmRole.OTHER });
    }

    inst.role = normalizedRole;
    return this.repo.save(inst);
  }

  async load(id: string) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);

    try {
      await this.mcp.loadModel(inst.model);
      inst.isActive = true;
      await this.repo.save(inst);
      return { ...inst, loadResult: { success: true } };
    } catch (e: any) {
      this.logger.warn(`load failed for ${inst.model}: ${e?.message || e}`);
      // we still mark it active=false to avoid stale UI
      inst.isActive = false;
      await this.repo.save(inst);
      return { ...inst, loadResult: { success: false, error: e?.message || String(e) } };
    }
  }

  async eject(id: string) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);

    try {
      await this.mcp.unloadModel(inst.model);
      inst.isActive = false;
      await this.repo.save(inst);
      return { ...inst, ejectResult: { success: true } };
    } catch (e: any) {
      this.logger.warn(`eject failed for ${inst.model}: ${e?.message || e}`);
      inst.isActive = false;
      await this.repo.save(inst);
      return { ...inst, ejectResult: { success: false, error: e?.message || String(e) } };
    }
  }

  async delete(id: string) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);

    await this.repo.delete(id);
    return { success: true, deletedInstance: inst };
  }

  async getSystemPrompt(id: string): Promise<{ systemPrompt: string }> {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);
    return { systemPrompt: inst.systemPrompt || '' };
  }

  async setSystemPrompt(id: string, systemPrompt: string | null) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);
    inst.systemPrompt = systemPrompt || '';
    return this.repo.save(inst);
  }

  async updateConfig(id: string, config: any) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);
    inst.config = config || null;
    return this.repo.save(inst);
  }

  async getModelStatusForInstance(id: string) {
    const inst = await this.repo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`LLM instance ${id} not found`);

    try {
      const status = await this.mcp.getModelStatus(inst.model);
      const loaded = (status as any)?.loaded ?? (status as any)?.isLoaded ?? undefined;
      return { source: 'mcp', loaded: loaded === undefined ? null : !!loaded, details: status };
    } catch (e: any) {
      return { source: 'none', loaded: null, details: { error: e?.message || String(e) } };
    }
  }

  async syncActiveFlagsFromLmStudio() {
    const models = await this.mcp.listModels().catch(() => []);
    const loadedIds = new Set<string>();
    for (const m of models || []) {
      const id = (m as any)?.id || (m as any)?.model || (m as any)?.name;
      if (id) loadedIds.add(String(id));
    }

    const all = await this.repo.find();
    for (const inst of all) {
      const shouldBeActive = loadedIds.has(inst.model);
      if (inst.isActive !== shouldBeActive) {
        inst.isActive = shouldBeActive;
        await this.repo.save(inst);
      }
    }

    return { success: true, loaded: Array.from(loadedIds) };
  }

  async scan() {
    // Scan used to discover instances via Mongo. We keep API compatibility and just return current instances.
    return this.list({ syncActive: true });
  }

  async cleanupDuplicates() {
    // Not implemented in TypeORM version (kept for API compatibility)
    return { message: 'cleanup not implemented' };
  }

  private normalizeRole(role: any): LlmRole {
    const r = String(role || '').toLowerCase();
    if (r === 'primary') return LlmRole.PRIMARY;
    if (r === 'secondary') return LlmRole.SECONDARY;
    return LlmRole.OTHER;
  }
}
