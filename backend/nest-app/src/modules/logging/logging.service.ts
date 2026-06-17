import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClaudeService } from '../llm/claude.service';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  private readonly DEFAULT_SYSTEM_PROMPT = `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent für ein Räuberbude-System.
Deine Aufgabe ist es, Benutzeranfragen zu verstehen und in strukturierte JSON-Aktionen zu übersetzen.
Die Benutzeranfragen werden zu großer Wahrscheinlichkeit auch deutschsprachig sein.
Benutzeranfragen werden oft im direktem Zusammenhang mit der Steuerung des Homeassistent liegen. Passe den Input gegebenenfalls an, so dass er einen Sinn ergibt.

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
    @InjectModel('IntentLog') private readonly intentLogModel: Model<any>,
    private readonly claudeService: ClaudeService,
  ) {}

  // ── Transcripts ──────────────────────────────────────────────────────────

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

  // ── Categories ────────────────────────────────────────────────────────────

  async listCategories() {
    return this.categoryModel.find().sort({ key: 1 }).lean();
  }

  async createCategory(data: any) {
    return this.categoryModel.create(data);
  }

  // ── Intent Logs ───────────────────────────────────────────────────────────

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
    return this.intentLogModel.aggregate([
      { $group: { _id: '$intent', count: { $sum: 1 }, avgConfidence: { $avg: '$confidence' } } },
      { $sort: { count: -1 } }
    ]);
  }

  // ── Claude / LLM ──────────────────────────────────────────────────────────

  async getDefaultSystemPrompt() {
    return { defaultPrompt: this.DEFAULT_SYSTEM_PROMPT };
  }

  async testLlmRequest(prompt?: string) {
    const testPrompt = prompt || 'Schalte das Licht im Wohnzimmer ein';
    this.logger.log(`Testing Claude request with prompt: "${testPrompt}"`);

    try {
      const response = await this.claudeService.request({
        systemPrompt: this.DEFAULT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: testPrompt }],
      });

      return {
        success: true,
        prompt: testPrompt,
        response: response.content,
        model: response.model,
        durationMs: response.durationMs,
        usage: response.usage,
      };
    } catch (error: any) {
      this.logger.error('Test Claude request failed:', error.message);
      return { success: false, error: error.message, prompt: testPrompt };
    }
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

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
