import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
      // make role exclusive
      await this.repo.update({ role: normalizedRole }, { role: LlmRole.OTHER });

      // policy: primary/secondary are always enabled (user expectation: loaded/selected => usable)
      if (inst.enabled === false) {
        inst.enabled = true;
      }
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
      const loaded = status?.loaded ?? status?.isLoaded;
      return { source: 'mcp', loaded: loaded === undefined ? null : !!loaded, details: status };
    } catch (e: any) {
      return { source: 'none', loaded: null, details: { error: e?.message || String(e) } };
    }
  }

  /**
   * Normalisiert Model-IDs für robustes Matching zwischen
   * - LM Studio /v1/models Katalog (id)
   * - LM Studio "loaded" Liste (id/model/name je nach Quelle)
   * - unseren persistierten Instanzen (inst.model)
   */
  private normalizeModelId(value: any): string {
    if (value === undefined || value === null) return '';

    let s = String(value).trim();
    if (!s) return '';

    // Falls versehentlich eine komplette URL gespeichert ist, nimm das letzte Segment als "Model-Id" Kandidat.
    // Beispiel: http://127.0.0.1:1234/v1/models -> models (nicht super),
    // besser: .../models/<id>. Wir behandeln trotzdem robust.
    try {
      if (s.startsWith('http://') || s.startsWith('https://')) {
        const u = new URL(s);
        const parts = u.pathname.split('/').filter(Boolean);
        const lastPath = parts.length ? parts[parts.length - 1] : '';
        s = lastPath || s;
      }
    } catch {
      // ignore URL parse errors
    }

    // Remove common prefixes that sometimes appear in different layers
    // (Wir behalten Namespaces wie "mistralai/..." und "openai/..." bewusst bei.)
    s = s.replace(/^models\//i, '').trim();

    return s;
  }

  /**
   * Liefert mögliche Model-Id Kandidaten aus einem "loaded" Modellobjekt.
   * Wir versuchen mehrere Keys, weil je nach Quelle/Tool unterschiedliche Shapes vorkommen.
   */
  private extractLoadedModelCandidates(m: any): string[] {
    const rawCandidates: any[] = [
      m?.id,
      m?.model,
      m?.name,
      m?.identifier,
      m?.modelId,
      m?.model_id,
    ];

    // Manche Tools liefern nested data: { model: { id: ... } }
    if (m?.model && typeof m.model === 'object') {
      rawCandidates.push(m.model.id, m.model.name);
    }

    // De-dupe + normalize
    const out = new Set<string>();
    for (const c of rawCandidates) {
      const n = this.normalizeModelId(c);
      if (n) out.add(n);
    }
    return Array.from(out);
  }

  private computeActiveMatch(loadedIds: Set<string>, modelNorm: string): { shouldBeActive: boolean; matchedBy: string | null } {
    if (loadedIds.has(modelNorm)) {
      return { shouldBeActive: true, matchedBy: 'normalized' };
    }

    const lastSeg = modelNorm.includes('/') ? modelNorm.split('/').pop() || '' : '';
    if (lastSeg && loadedIds.has(lastSeg)) {
      return { shouldBeActive: true, matchedBy: 'lastSegment' };
    }

    return { shouldBeActive: false, matchedBy: null };
  }

  async syncActiveFlagsFromLmStudio() {
    // IMPORTANT: we must sync against LOADED models (source of truth), not the available/downloaded catalog.
    const models = await this.mcp.listLoadedModels().catch(() => []);

    // Build a normalized lookup set.
    const loadedIds = new Set<string>();
    const loadedDebug: Array<{ raw: any; candidates: string[] }> = [];

    for (const m of models || []) {
      const candidates = this.extractLoadedModelCandidates(m);
      for (const c of candidates) loadedIds.add(c);
      loadedDebug.push({ raw: m, candidates });
    }

    const all = await this.repo.find();
    const perInstanceDebug: Array<{ id: string; model: string; modelNorm: string; shouldBeActive: boolean; matchedBy: string | null }> = [];

    for (const inst of all) {
      const modelNorm = this.normalizeModelId(inst.model);
      const { shouldBeActive, matchedBy } = this.computeActiveMatch(loadedIds, modelNorm);

      // Update DB only if changed
      if (inst.isActive !== shouldBeActive) {
        inst.isActive = shouldBeActive;
        await this.repo.save(inst);
      }

      perInstanceDebug.push({
        id: inst.id,
        model: inst.model,
        modelNorm,
        shouldBeActive,
        matchedBy,
      });
    }

    // Return debug so UI/Logs can diagnose mismatches quickly.
    return {
      success: true,
      loaded: Array.from(loadedIds),
      debug: {
        loadedCount: (models || []).length,
        loadedCandidates: loadedDebug,
        instances: perInstanceDebug,
      },
    };
  }

  private getDefaultChatCompletionsUrl(): string {
    const base = (process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234').replace(/\/+$/, '');
    return `${base}/v1/chat/completions`;
  }

  private normalizeAvailableModelId(m: any): string {
    // /v1/models liefert typischerweise: { id: 'meta-llama...', object: 'model', owned_by: ... }
    return this.normalizeModelId(m?.id || m?.model || m?.name);
  }

  /**
   * Sync: LM Studio (available models) -> DB
   * - legt neue Modelle an (enabled=false, role=other)
   * - aktualisiert bestehende Einträge (name/url/model)
   *
   * Hinweis: "available" != "loaded". Loaded-State wird separat per syncActiveFlagsFromLmStudio() gesetzt.
   */
  async syncFromLmStudioToDb(): Promise<{ created: number; updated: number; seen: number }> {
    const available = await this.mcp.listAvailableModels().catch(() => []);
    const seenIds = (available || []).map(m => this.normalizeAvailableModelId(m)).filter(Boolean);

    const defaultUrl = this.getDefaultChatCompletionsUrl();

    let created = 0;
    let updated = 0;

    for (const m of available || []) {
      const modelId = this.normalizeAvailableModelId(m);
      if (!modelId) continue;

      // Find by model id (primary key for LM Studio models)
      const existing = await this.repo.findOne({ where: { model: modelId } as any });

      const name = (m?.id || m?.name || modelId) as string;

      if (!existing) {
        const inst = this.repo.create({
          name,
          model: modelId,
          url: defaultUrl,
          enabled: false,
          role: LlmRole.OTHER,
          isActive: false,
          systemPrompt: null,
          config: null,
        } as any);

        await this.repo.save(inst);
        created++;
      } else {
        // Minimal update: keep user choices (enabled/role/systemPrompt/config) intact.
        let changed = false;
        if (!existing.url) {
          existing.url = defaultUrl;
          changed = true;
        }
        if (!existing.name || existing.name === existing.model) {
          existing.name = name;
          changed = true;
        }
        // Ensure model field is normalized (in case legacy stored weird strings)
        const normalizedExistingModel = this.normalizeModelId(existing.model);
        if (normalizedExistingModel && normalizedExistingModel !== existing.model) {
          existing.model = normalizedExistingModel;
          changed = true;
        }

        if (changed) {
          await this.repo.save(existing);
          updated++;
        }
      }
    }

    return { created, updated, seen: seenIds.length };
  }

  async scan() {
    // "scan" soll die DB als Quelle liefern, aber vorher LM Studio -> DB aktualisieren.
    const syncResult = await this.syncFromLmStudioToDb().catch((e) => {
      this.logger.warn(`syncFromLmStudioToDb failed: ${e?.message || e}`);
      return { created: 0, updated: 0, seen: 0 };
    });

    // Danach Active-Flags (loaded) syncen.
    await this.syncActiveFlagsFromLmStudio().catch(() => undefined);

    const list = await this.repo.find({ order: { createdAt: 'DESC' } });
    return {
      sync: syncResult,
      data: list,
    };
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
