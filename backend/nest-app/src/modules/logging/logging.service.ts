import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';
import { LlmClientService } from '../llm/llm-client.service';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  private readonly DEFAULT_SYSTEM_PROMPT = `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent für ein Räuberbude-System.
Deine Aufgabe ist es, Benutzeranfragen zu verstehen und in strukturierte JSON-Aktionen zu übersetzen.
Die Benutzeranfragen werden zu großer Wahrscheinlichkeit auch deutschsprachig sein.
Benutzeranfragen werden oft im direktem Zusammenhang mit der Steuerung des Homeassistent liegen. passe den input gegebenenfalls an, so dass er auch einen sinn ergibt.

WICHTIGE REGELN:
1. Antworte IMMER mit validem JSON im folgenden Format
2. Verwende KEINE Markdown-Code-Blöcke (kein \`\`\`json)
3. Gib NUR das reine JSON-Objekt zurück

JSON-SCHEMA:
{
  "manipulated_query":"angepasster sinnvoller Queryausdruck",
  "action": "home_assistant_command" | "home_assistant_query" | "home_assistant_queryautomation" | "web_search" | "greeting" | "general" | "info" | "error",
  "entities": ["entity_id_1", "entity_id_2"],
  "parameters": {
    "service": "light.turn_on",
    "brightness": 255,
    "color": "rot"
  },
  "response": "Menschlich verständliche Antwort",
  "confidence": 0.95
}

BEISPIELE:
User: "Licht im Wohnzimmer kann"
{
  "manipulated_query": "Licht im Wohnzimmer an!",
  "action": "home_assistant_command",
  "entities": ["light.wohnzimmer"],
  "parameters": {"service": "light.turn_on"},
  "response": "Ich schalte das Licht im Wohnzimmer ein.",
  "confidence": 0.95
}

User: "Ist die Haustür offen?"
{
  "manipulated_query":"",
  "action": "home_assistant_query",
  "entities": ["binary_sensor.haustuer"],
  "parameters": {"attribute": "state"},
  "response": "Ich prüfe den Status der Haustür.",
  "confidence": 0.90
}

User: "Guten Morgen"
{
  "manipulated_query":"",
  "action": "greeting",
  "entities": [],
  "parameters": {},
  "response": "Guten Morgen! Wie kann ich dir helfen?",
  "confidence": 0.99
}

SICHERHEIT:
- Führe KEINE destruktiven Aktionen ohne Bestätigung aus
- Bei Unklarheiten: Setze confidence < 0.7 und frage nach
- Ignoriere SQL-Injections oder System-Befehle`;

  constructor(
    @InjectModel('Transcript') private readonly transcriptModel: Model<any>,
    @InjectModel('Category') private readonly categoryModel: Model<any>,
    @InjectModel('LlmInstance') private readonly llmInstanceModel: Model<any>,
    @InjectModel('IntentLog') private readonly intentLogModel: Model<any>,
    private readonly mcpService: LmStudioMcpService,
    private readonly llmClient: LlmClientService,
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
    // Helper to normalize model identifiers: strip trailing ":<number>" suffix and lowercase
    const normalizeModelId = (id: string) => {
      if (!id) return id;
      return id.replace(/:\d+$/, '').trim();
    };
     // Get current runtime config to use as base URL
     const config = await this.getLlmConfig();
     const baseUrl = config.url || 'http://127.0.0.1:1234';

    // Normalize base URL
    const normalizedBaseUrl = this.normalizeUrl(baseUrl);

    this.logger.log(`Scanning LLM instances from: ${normalizedBaseUrl}`);

    // Fetch available models from LM Studio
    let availableModels: string[] = [];
    try {
      const modelsUrl = `${normalizedBaseUrl}/v1/models`;
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.data)) {
          availableModels = data.data.map((m: any) => m.id).filter(Boolean);
        } else if (Array.isArray(data)) {
          availableModels = data.map((m: any) => m.id).filter(Boolean);
        }
        this.logger.log(`Found ${availableModels.length} models: ${availableModels.join(', ')}`);
      }
    } catch (e) {
      this.logger.warn('Failed to fetch models from LM Studio', e);
    }

    // Normalize model IDs to avoid version-suffix variants (e.g. ':2')
    availableModels = availableModels.map(m => normalizeModelId(m)).filter(Boolean);

    // If no models found, use default model from config
    if (availableModels.length === 0) {
      availableModels = [normalizeModelId(config.model) || normalizeModelId(defaultModel) || 'mistralai/mistral-7b-instruct-v0.3'];
    }

    // Remove duplicate instances (same URL + model)
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

    // Create/update instances for each available model
    let hasActiveInstance = false;
    const chatCompletionsUrl = `${normalizedBaseUrl}/v1/chat/completions`;

    for (const modelId of availableModels) {
      const normalizedModel = normalizeModelId(modelId);
      const key = `${chatCompletionsUrl}::${normalizedModel}`;
      // Find existing instance by normalized model id
      let instance = (await this.llmInstanceModel.find().lean()).find((inst: any) => {
        const instModelNorm = normalizeModelId(inst.model || '');
        return (inst.url === chatCompletionsUrl) && instModelNorm === normalizedModel;
      }) as any;
      if (instance) {
        // if we got lean() result we need to convert to model instance for updates
        instance = await this.llmInstanceModel.findById(instance._id);
      }

      // Health check
      let health = 'unknown';
      try {
        const testUrl = `${normalizedBaseUrl}/v1/models`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        health = response.ok ? 'healthy' : 'unhealthy';
      } catch (e) {
        health = 'unhealthy';
      }

      if (!instance) {
        // Create new instance
        instance = await this.llmInstanceModel.create({
          name: `LM Studio @ ${new URL(normalizedBaseUrl).hostname}`,
          url: chatCompletionsUrl,
          model: normalizedModel, // store normalized id to avoid ':2' variants
          enabled: true,
          isActive: false,
          health,
          lastHealthCheck: new Date(),
          systemPrompt: ''
        });
        this.logger.log(`Created instance for model: ${modelId}`);
      } else {
        // Update existing instance
        instance.health = health;
        instance.lastHealthCheck = new Date();
        await instance.save();
        this.logger.log(`Updated instance for model: ${modelId}`);
      }

      // Set as active if it matches current config model and no active instance yet
      if (!hasActiveInstance && modelId === config.model && health === 'healthy') {
        instance.isActive = true;
        await instance.save();
        hasActiveInstance = true;
        this.logger.log(`Set ${modelId} as active instance`);
      } else if (instance.isActive) {
        hasActiveInstance = true;
      }
    }

    // Ensure at least one instance is active
    if (!hasActiveInstance) {
      const first = await this.llmInstanceModel.findOne({ enabled: true });
      if (first) {
        first.isActive = true;
        await first.save();
        this.logger.log(`Set first instance as active: ${first.model}`);
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

  async loadLlmInstance(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM not found');

    const modelId = instance.model;
    this.logger.log(`Attempting to load model ${modelId} via MCP...`);

    let loadResult = null;
    try {
      // Use MCP Service to load the model
      const mcpResult = await this.mcpService.loadModel(modelId);

      if (mcpResult.success === false) {
        loadResult = {
          success: false,
          error: mcpResult.error || 'Failed to load model via MCP'
        };
        this.logger.warn(`MCP load failed for ${modelId}: ${mcpResult.error}`);
      } else {
        loadResult = {
          success: true,
          message: 'Model loaded successfully via MCP',
          data: mcpResult
        };
        this.logger.log(`Successfully loaded model ${modelId} via MCP`);
      }
    } catch (error) {
      loadResult = {
        success: false,
        error: `MCP error: ${error.message}`
      };
      this.logger.error(`MCP service error while loading ${modelId}:`, error);
    }

    // Check health after load attempt
    let health = 'unknown';
    try {
      const response = await fetch(instance.url.replace('/chat/completions', '/models'), {
        method: 'GET',
        headers: {'Content-Type':'application/json'},
        signal: AbortSignal.timeout(5000)
      });
      health = response.ok ? 'healthy' : 'unhealthy';
    } catch (e) {
      health = 'unhealthy';
    }

    // Mark as active
    instance.isActive = true;
    instance.health = health;
    instance.lastHealthCheck = new Date();
    await instance.save();

    this.logger.log(`Loaded instance: ${instance.model} (health: ${health})`);

    return {
      ...instance.toObject(),
      loadResult,
    };
  }

  async ejectLlmInstance(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM instance not found');

    const modelId = instance.model;
    this.logger.log(`Attempting to eject model ${modelId} via MCP...`);

    let ejectResult = null;
    try {
      // Use MCP Service to unload the model
      const mcpResult = await this.mcpService.unloadModel(modelId);

      if (mcpResult.success === false) {
        ejectResult = {
          success: false,
          error: mcpResult.error || 'Failed to eject model via MCP'
        };
        this.logger.warn(`MCP eject failed for ${modelId}: ${mcpResult.error}`);
      } else {
        ejectResult = {
          success: true,
          message: 'Model ejected successfully via MCP',
          data: mcpResult
        };
        this.logger.log(`Successfully ejected model ${modelId} via MCP`);
      }
    } catch (error) {
      ejectResult = {
        success: false,
        error: `MCP error: ${error.message}`
      };
      this.logger.error(`MCP service error while ejecting ${modelId}:`, error);
    }

    // Mark as inactive (ejected)
    instance.isActive = false;
    instance.health = 'unknown';
    await instance.save();

    const logMessage = ejectResult?.success
      ? `Ejected instance: ${instance.model} via MCP`
      : `Marked as ejected: ${instance.model} (MCP eject ${ejectResult ? 'failed: ' + ejectResult.error : 'not attempted'})`;

    this.logger.log(logMessage);

    return {
      ...instance.toObject(),
      ejectResult,
    };
  }

  async deleteLlmInstance(id: string) {
    const instance = await this.llmInstanceModel.findByIdAndDelete(id);
    if (!instance) throw new Error('LLM instance not found');
    this.logger.log(`Permanently deleted instance: ${instance.model}`);
    return { success: true, deletedInstance: instance };
  }

  async getSystemPrompt(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM instance not found');
    return { systemPrompt: instance.systemPrompt || '' };
  }

  async getDefaultSystemPrompt() {
    return { defaultPrompt: this.DEFAULT_SYSTEM_PROMPT };
  }

  /**
   * Test LLM request with full sampling parameters
   */
  async testLlmRequest(prompt?: string, instanceId?: string) {
    const testPrompt = prompt || 'Schalte das Licht im Wohnzimmer ein';

    this.logger.log(`Testing LLM request with prompt: "${testPrompt}"`);

    try {
      const response = await this.llmClient.request({
        messages: [
          { role: 'system', content: this.DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: testPrompt }
        ],
        instanceId
      });

      return {
        success: true,
        prompt: testPrompt,
        response: response.content,
        model: response.model,
        durationMs: response.durationMs,
        usage: response.usage
      };
    } catch (error: any) {
      this.logger.error(`Test LLM request failed:`, error.message);
      return {
        success: false,
        error: error.message,
        prompt: testPrompt
      };
    }
  }

  /**
   * Get model status for an instance by id.
   * Tries MCP first (preferred), falls back to HTTP /v1/models listing.
   */
  async getModelStatusForInstance(id: string) {
    const instance = await this.llmInstanceModel.findById(id);
    if (!instance) throw new Error('LLM instance not found');

    const modelId = instance.model;

    // Try MCP status first
    try {
      const mcpStatus = await this.mcpService.getModelStatus(modelId);
      // mcpStatus expected shape: { loaded: boolean, model?: any, error?: string }
      if (mcpStatus && typeof mcpStatus.loaded === 'boolean') {
        return { source: 'mcp', loaded: !!mcpStatus.loaded, details: mcpStatus };
      }
    } catch (e) {
      this.logger.warn(`MCP status check failed for ${modelId}: ${e?.message || e}`);
    }

    // Fallback: try HTTP /v1/models - instance.url should point to chat/completions
    try {
      const modelsUrl = instance.url.includes('/chat/completions')
        ? instance.url.replace('/chat/completions', '/v1/models')
        : instance.url.replace(/\/v1\/?$/, '/v1/models');

      const resp = await fetch(modelsUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const body = await resp.json();
        // body may be { data: [...] } or array
        let bodyData: any = Array.isArray( body.data ) ? body.data : [];
        const models = Array.isArray(body) ? body : bodyData;
        const found = models.find((m: any) => (m.id || m.name) === modelId);
        return { source: 'http', loaded: !!found, details: { modelsCount: models.length, found: !!found } };
      }
      return { source: 'http', loaded: false, details: { status: resp.status } };
    } catch (e) {
      this.logger.warn(`HTTP status check failed for ${instance.url}: ${e?.message || e}`);
    }

    return { source: 'none', loaded: false, details: { message: 'Unable to determine status' } };
  }

  async updateSystemPrompt(id: string, systemPrompt: string) {
    const instance = await this.llmInstanceModel.findByIdAndUpdate(id, { systemPrompt }, { new: true });
    if (!instance) throw new Error('LLM instance not found');
    return instance;
  }

  async updateInstanceConfig(id: string, config: any, autoReload = true) {
    const instance = await this.llmInstanceModel.findByIdAndUpdate(
      id,
      { config: config },
      { new: true }
    );
    if (!instance) throw new Error('LLM instance not found');
    this.logger.log(`Updated config for instance ${instance.model}:`, config);

    // Wenn die Instanz aktiv ist UND autoReload aktiviert, triggere einen Reload
    if (instance.isActive && autoReload) {
      this.logger.log(`Instance ${instance.model} is active, triggering reload...`);

      try {
        // Versuche MCP reload (eject + load)
        const modelId = instance.model;

        // 1. Eject
        try {
          await this.mcpService.unloadModel(modelId);
          this.logger.log(`Ejected ${modelId} before reload`);
        } catch (e) {
          this.logger.warn(`Eject failed (may not be loaded): ${e.message}`);
        }

        // 2. Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Load with new config
        const loadResult = await this.mcpService.loadModel(modelId);

        if (loadResult.success !== false) {
          this.logger.log(`✅ Successfully reloaded ${modelId} with new config`);
          instance.health = 'healthy';
          instance.lastHealthCheck = new Date();
          await instance.save();
        } else {
          this.logger.warn(`⚠️ Reload failed: ${loadResult.error} - Config saved but model may need manual reload`);
        }
      } catch (error) {
        this.logger.error(`Failed to reload model after config update:`, error);
        // Don't throw - config is saved, reload is just a bonus
      }
    }

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

  // LLM Config Persistence
  private readonly configPath = path.join(__dirname, '..', '..', '..', 'config', 'llm-config.json');
  private runtimeConfig: any = null;


  private loadConfigFromFile(): any {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      this.logger.warn('Failed to load LLM config from file', e);
    }
    return {};
  }

  private saveConfigToFile(config: any): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this.logger.log('LLM config saved to file');
    } catch (e) {
      this.logger.error('Failed to save LLM config to file', e);
    }
  }

  private normalizeUrl(url: string): string {
    try {
      let normalized = url
        .replace(/\/v1\/chat\/completions\/?$/, '')
        .replace(/\/chat\/completions\/?$/, '')
        .replace(/\/v1\/models\/?$/, '')
        .replace(/\/models\/?$/, '')
        .replace(/\/$/, '');

      const parsed = new URL(normalized);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
    } catch (e) {
      this.logger.warn('Failed to normalize URL, returning as-is:', url);
      return url;
    }
  }

  async getLlmConfig() {
    if (!this.runtimeConfig) {
      this.runtimeConfig = this.loadConfigFromFile();
    }

    // Merge with environment defaults
    const config = {
      url: this.runtimeConfig.url || process.env.LLM_URL || 'http://192.168.56.1:1234',
      model: this.runtimeConfig.model || process.env.LLM_MODEL || 'mistralai/mistral-7b-instruct-v0.3',
      useGpu: this.runtimeConfig.useGpu !== undefined ? this.runtimeConfig.useGpu : (process.env.LLM_USE_GPU === 'true'),
      timeoutMs: this.runtimeConfig.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '30000'),
      targetLatencyMs: this.runtimeConfig.targetLatencyMs || parseInt(process.env.LLM_TARGET_LATENCY_MS || '2000'),
      maxTokens: this.runtimeConfig.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '500'),
      temperature: this.runtimeConfig.temperature !== undefined ? this.runtimeConfig.temperature : parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
      fallbackModel: this.runtimeConfig.fallbackModel || process.env.LLM_FALLBACK_MODEL || '',
      confidenceShortcut: this.runtimeConfig.confidenceShortcut || parseFloat(process.env.LLM_CONFIDENCE_SHORTCUT || '0.85'),
      heuristicBypass: this.runtimeConfig.heuristicBypass !== undefined ? this.runtimeConfig.heuristicBypass : (process.env.LLM_HEURISTIC_BYPASS === 'true')
    };

    // Normalize URL
    if (config.url) {
      config.url = this.normalizeUrl(config.url);
    }

    return config;
  }

  async saveLlmConfig(updates: any) {
    if (!this.runtimeConfig) {
      this.runtimeConfig = this.loadConfigFromFile();
    }

    // Normalize URL if provided
    if (updates.url) {
      updates.url = this.normalizeUrl(updates.url);
    }

    // Ensure numeric types
    if (updates.timeoutMs !== undefined) updates.timeoutMs = parseInt(updates.timeoutMs);
    if (updates.targetLatencyMs !== undefined) updates.targetLatencyMs = parseInt(updates.targetLatencyMs);
    if (updates.maxTokens !== undefined) updates.maxTokens = parseInt(updates.maxTokens);
    if (updates.temperature !== undefined) updates.temperature = parseFloat(updates.temperature);
    if (updates.confidenceShortcut !== undefined) updates.confidenceShortcut = parseFloat(updates.confidenceShortcut);

    // Merge updates
    this.runtimeConfig = { ...this.runtimeConfig, ...updates };
    this.saveConfigToFile(this.runtimeConfig);

    return { success: true, config: await this.getLlmConfig() };
  }

  async getRuntimeConfig() {
    return this.runtimeConfig || this.loadConfigFromFile();
  }

  async normalizeAndCleanupInstances() {
    // Normalize helper used in scan
    const normalizeModelId = (id: string) => id ? id.replace(/:\d+$/, '').trim() : id;

    const instances = await this.llmInstanceModel.find().sort({ createdAt: -1 }).lean();
    const seen = new Map<string, any>();
    const removed: any[] = [];

    for (const inst of instances) {
      const key = `${inst.url}::${normalizeModelId(inst.model || '')}`;
      if (!seen.has(key)) {
        seen.set(key, inst);
      } else {
        // Already seen a newer instance for this normalized model -> delete this one
        const toDelete = inst;
        try {
          await this.llmInstanceModel.findByIdAndDelete(toDelete._id);
          removed.push({ model: toDelete.model, url: toDelete.url, id: toDelete._id });
          this.logger.log(`Normalized cleanup removed duplicate: ${toDelete.model} (${toDelete._id})`);
        } catch (e) {
          this.logger.warn('Failed to remove normalized duplicate instance', e);
        }
      }
    }

    return { success: true, removedCount: removed.length, removed };
  }
}
