import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  constructor(
    @InjectModel('Transcript') private readonly transcriptModel: Model<any>,
    @InjectModel('Category') private readonly categoryModel: Model<any>,
    @InjectModel('LlmInstance') private readonly llmInstanceModel: Model<any>,
    @InjectModel('IntentLog') private readonly intentLogModel: Model<any>,
  ) {}

  async createTranscript(data: any) {
    return this.transcriptModel.create(data);
  }

  async listTranscripts(query: any, page = 1, limit = 50) {
    const q = { ...(query || {}) };
    const total = await this.transcriptModel.countDocuments(q);
    const transcripts = await this.transcriptModel.find(q).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).lean();
    return { transcripts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getTranscript(id: string) {
    return this.transcriptModel.findById(id);
  }

  async updateTranscript(id: string, updates: any) {
    return this.transcriptModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  }

  async bulkUpdate(ids: string[], updates: any) {
    const result = await this.transcriptModel.updateMany({ _id: { $in: ids } }, { $set: updates });
    return { success: true, modifiedCount: result.modifiedCount };
  }

  async statsSummary(query: any) {
    const stats = await this.transcriptModel.aggregate([
      { $match: query || {} },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          avgLlmTime: { $avg: '$timings.llmMs' },
          avgConfidence: { $avg: '$confidence' },
          validCount: { $sum: { $cond: ['$isValid', 1, 0] } },
          fallbackCount: { $sum: { $cond: ['$fallbackUsed', 1, 0] } },
          categoryCounts: { $push: '$category' }
        }
      }
    ]);

    const modelStats = await this.transcriptModel.aggregate([
      { $match: query || {} },
      {
        $group: {
          _id: '$model',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          avgLlmTime: { $avg: '$timings.llmMs' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return { summary: stats[0] || {}, byModel: modelStats };
  }

  async listCategories() {
    return this.categoryModel.find().sort({ key: 1 }).lean();
  }

  async createCategory(data: any) {
    return this.categoryModel.create(data);
  }

  async listLlmInstances() {
    return this.llmInstanceModel.find().sort({ createdAt: -1 }).lean();
  }

  async scanLlmInstances(llmUrlsString: string | undefined, defaultModel: string) {
    // minimal wrapper to reuse the backend logic in server.js
    const llmUrls = (llmUrlsString || defaultModel || '').split(',').map((s:string) => s.trim()).filter(Boolean);
    // For consistency, reuse existing DB instances and perform health checks similar to server.js
    const allInstances = await this.llmInstanceModel.find();
    const urlModelMap = new Map();

    for (const instance of allInstances) {
      const key = `${instance.url}::${instance.model}`;
      if (urlModelMap.has(key)) {
        const existing = urlModelMap.get(key);
        const toDelete = existing.createdAt < instance.createdAt ? existing : instance;
        await this.llmInstanceModel.findByIdAndDelete(toDelete._id);
      } else {
        urlModelMap.set(key, instance);
      }
    }

    let hasActiveInstance = false;

    for (const url of llmUrls) {
      const existing = await this.llmInstanceModel.findOne({ url });
      if (!existing) {
        let health = 'unknown';
        try {
          const response = await fetch(url.replace('/chat/completions', '/models'), { method: 'GET', headers: {'Content-Type':'application/json'}, signal: AbortSignal.timeout(5000) });
          health = response.ok ? 'healthy' : 'unhealthy';
        } catch (e) {
          health = 'unhealthy';
        }

        const instance = await this.llmInstanceModel.create({ name: `LM Studio @ ${new URL(url).hostname}`, url, model: defaultModel, enabled: true, isActive: false, health, lastHealthCheck: new Date(), systemPrompt: '' });
        if (!hasActiveInstance && health === 'healthy') {
          instance.isActive = true;
          await instance.save();
          hasActiveInstance = true;
        }
      } else {
        if (existing.isActive) hasActiveInstance = true;
      }
    }

    if (!hasActiveInstance) {
      const first = await this.llmInstanceModel.findOne({ enabled: true });
      if (first) {
        first.isActive = true;
        await first.save();
      }
    }

    return this.llmInstanceModel.find().sort({ createdAt: -1 }).lean();
  }

  async cleanupLlmInstances() {
    const allInstances = await this.llmInstanceModel.find();
    const deleted = [];

    const urlModelMap = new Map();
    for (const instance of allInstances) {
      const key = `${instance.url}::${instance.model}`;
      const existing = urlModelMap.get(key);
      if (existing) {
        const toDelete = existing.createdAt < instance.createdAt ? existing : instance;
        await this.llmInstanceModel.findByIdAndDelete(toDelete._id);
        deleted.push({ model: toDelete.model, url: toDelete.url, reason: 'exact duplicate' });
        urlModelMap.set(key, existing);
      } else {
        urlModelMap.set(key, instance);
      }
    }

    // remove localhost duplicates in favor of external
    const remaining = await this.llmInstanceModel.find().sort({ createdAt: -1 }).lean();
    return { success: true, deleted: deleted.length, deletedInstances: deleted, remaining };
  }

  async activateLlmInstance(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM not found');

    let health = 'unknown';
    try {
      const response = await fetch(instance.url.replace('/chat/completions', '/models'), { method: 'GET', headers: {'Content-Type':'application/json'}, signal: AbortSignal.timeout(5000) });
      health = response.ok ? 'healthy' : 'unhealthy';
    } catch (e) {
      health = 'unhealthy';
    }

    if (health !== 'healthy') throw new Error('LLM instance is not healthy');

    await this.llmInstanceModel.updateMany({}, { isActive: false });
    instance.isActive = true;
    instance.health = health;
    instance.lastHealthCheck = new Date();
    await instance.save();
    return instance;
  }

  async getSystemPrompt(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM instance not found');
    return { systemPrompt: instance.systemPrompt || '' };
  }

  async updateSystemPrompt(id: string, systemPrompt: string) {
    const instance = await this.llmInstanceModel.findByIdAndUpdate(id, { systemPrompt }, { new: true });
    if (!instance) throw new Error('LLM instance not found');
    return instance;
  }

  async createIntentLog(data: any) {
    return this.intentLogModel.create(data);
  }

  async listIntentLogs(query: any, page = 1, limit = 50) {
    const q = { ...(query || {}) };
    const total = await this.intentLogModel.countDocuments(q);
    const items = await this.intentLogModel.find(q).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).lean();
    return { intentLogs: items, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async intentStats() {
    const stats = await this.intentLogModel.aggregate([
      { $group: { _id: '$intent', count: { $sum: 1 }, avgConfidence: { $avg: '$confidence' } } },
      { $sort: { count: -1 } }
    ]);
    return stats;
  }

  async dbInfo() {
    const db = (this.transcriptModel.db as any).client.db();
    const collections = await db.listCollections().toArray();
    const result = {} as any;
    for (const c of collections) {
      try {
        result[c.name] = await db.collection(c.name).countDocuments();
      } catch (e) {
        result[c.name] = { error: (e as Error).message };
      }
    }
    return { dbName: db.databaseName, collections: result };
  }
}

