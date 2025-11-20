import express from 'express';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Import models used by the server
import Log from '../models/Log.js';
import User from '../models/User.js';
import Transcript from '../models/Transcript.js'; // Used in API routes below
import IntentLog from '../models/IntentLog.js';
import Category from '../models/Category.js';
import LlmInstance from '../models/LlmInstance.js';

dotenv.config();

const app = express();

// CORS configuration - allow all localhost origins for development
app.use(cors({
  origin: true, // Allow any origin in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Handle preflight requests globally
app.options('*', cors());

app.use(express.json());

// Connect to MongoDB using an environment variable. If the variable is
// not provided a local database is used instead.
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/logging';
// Mask password for safe logging
const maskedUri = mongoUri.replace(/:\/\/(.*@)/, '://****@');
console.log(`Connecting to MongoDB using: ${maskedUri}`);

mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connection established');
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
  });

// Seed categories on startup
async function seedCategories() {
  const categories = [
    { key: 'home_assistant_command', label: 'Home Assistant Befehl' },
    { key: 'home_assistant_query', label: 'Home Assistant Abfrage' },
    { key: 'home_assistant_queryautomation', label: 'Home Assistant Automation-Abfrage' },
    { key: 'navigation', label: 'Navigation' },
    { key: 'web_search', label: 'Websuche' },
    { key: 'greeting', label: 'Begrüßung' },
    { key: 'general_question', label: 'Allgemeine Frage' },
    { key: 'unknown', label: 'Unbekannt' }
  ];

  try {
    for (const cat of categories) {
      await Category.findOneAndUpdate(
        { key: cat.key },
        { $setOnInsert: cat },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Categories seeded');
  } catch (error) {
    console.error('Failed to seed categories:', error);
  }
}

// Scan LLM instances from environment variables on startup
async function scanLlmInstances() {
  const llmUrlsString = process.env.LLM_URLS || 'http://192.168.56.1:1234/v1/chat/completions';
  const llmUrls = llmUrlsString.split(',').map(url => url.trim());
  const defaultModel = process.env.LLM_MODEL || 'mistralai/mistral-7b-instruct-v0.3';

  try {
    // Bereinige Duplikate: Lösche Instanzen mit gleicher URL+Model Kombination (behalte nur neueste)
    const allInstances = await LlmInstance.find();
    const urlModelMap = new Map();

    for (const instance of allInstances) {
      const key = `${instance.url}::${instance.model}`;
      const existing = urlModelMap.get(key);

      if (existing) {
        // Duplikat gefunden - lösche das ältere
        const toDelete = existing.createdAt < instance.createdAt ? existing : instance;
        const toKeep = existing.createdAt < instance.createdAt ? instance : existing;

        await LlmInstance.findByIdAndDelete(toDelete._id);
        console.log(`🧹 Removed duplicate: ${toDelete.model} @ ${new URL(toDelete.url).hostname}`);
        urlModelMap.set(key, toKeep);
      } else {
        urlModelMap.set(key, instance);
      }
    }

    let hasActiveInstance = false;

    for (const url of llmUrls) {
      // Check if instance already exists
      const existing = await LlmInstance.findOne({ url });

      if (!existing) {
        // Test connection
        let health = 'unknown';
        try {
          const response = await fetch(url.replace('/chat/completions', '/models'), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          health = response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
          health = 'unhealthy';
        }

        const instance = await LlmInstance.create({
          name: `LM Studio @ ${new URL(url).hostname}`,
          url,
          model: defaultModel,
          enabled: true,
          isActive: false,
          health,
          lastHealthCheck: new Date(),
          systemPrompt: getDefaultSystemPrompt()
        });

        console.log(`✅ LLM instance registered: ${defaultModel} @ ${new URL(url).hostname}`);

        // Set first healthy instance as active
        if (!hasActiveInstance && health === 'healthy') {
          instance.isActive = true;
          await instance.save();
          hasActiveInstance = true;
          console.log(`✅ Set ${defaultModel} @ ${new URL(url).hostname} as active LLM`);
        }
      } else {
        if (existing.isActive) {
          hasActiveInstance = true;
        }
      }
    }

    // If no active instance exists, set first enabled instance as active
    if (!hasActiveInstance) {
      const firstInstance = await LlmInstance.findOne({ enabled: true });
      if (firstInstance) {
        firstInstance.isActive = true;
        await firstInstance.save();
        console.log(`✅ Set ${firstInstance.model} as active LLM (default)`);
      }
    }
  } catch (error) {
    console.error('Failed to scan LLM instances:', error);
  }
}

// Default system prompt for LLM instances
function getDefaultSystemPrompt() {
  return `Du bist ein intelligenter Smart-Home-Assistent für ein Räuberbude-System.
Deine Aufgabe ist es, Benutzeranfragen zu verstehen und in strukturierte JSON-Aktionen zu übersetzen.

WICHTIGE REGELN:
1. Antworte IMMER mit validem JSON im folgenden Format
2. Verwende KEINE Markdown-Code-Blöcke (kein \`\`\`json)
3. Gib NUR das reine JSON-Objekt zurück

JSON-SCHEMA:
{
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
User: "Licht im Wohnzimmer an"
{
  "action": "home_assistant_command",
  "entities": ["light.wohnzimmer"],
  "parameters": {"service": "light.turn_on"},
  "response": "Ich schalte das Licht im Wohnzimmer ein.",
  "confidence": 0.95
}

User: "Ist die Haustür offen?"
{
  "action": "home_assistant_query",
  "entities": ["binary_sensor.haustuer"],
  "parameters": {"attribute": "state"},
  "response": "Ich prüfe den Status der Haustür.",
  "confidence": 0.90
}

User: "Guten Morgen"
{
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
}

// Initialize on MongoDB connection
mongoose.connection.once('open', async () => {
  console.log('🔌 MongoDB connected');
  await seedCategories();
  await scanLlmInstances();
});

// Route to create a user. Only a pseudonymous username is stored.
app.post('/user', async (req, res) => {
  const user = await User.create({ username: req.body.username });
  res.status(201).json({ id: user._id });
});

// Route for logging user actions. The client sends a user identifier and
// a description of the action. Only minimal information is stored to
// respect user privacy.
app.post('/log-action', async (req, res) => {
  const { userId, action, details } = req.body;
  await Log.create({
    userId,
    type: 'action',
    message: `${action}${details ? ': ' + details : ''}`,
    timestamp: new Date()
  });
  res.sendStatus(201);
});

// ===== Transcript API Endpoints =====

// Create a new transcript entry
app.post('/api/transcripts', async (req, res) => {
  try {
    const transcript = await Transcript.create(req.body);
    res.status(201).json(transcript);
  } catch (error) {
    console.error('Failed to create transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transcripts with pagination and filtering
app.get('/api/transcripts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      terminalId,
      model,
      category,
      isValid,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (terminalId) query.terminalId = terminalId;
    if (model) query.model = model;
    if (category) query.category = category;
    if (isValid !== undefined) query.isValid = isValid === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Transcript.countDocuments(query);
    const transcripts = await Transcript.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    res.json({
      transcripts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Failed to fetch transcripts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single transcript by ID
app.get('/api/transcripts/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    res.json(transcript);
  } catch (error) {
    console.error('Failed to fetch transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated statistics
app.get('/api/transcripts/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await Transcript.aggregate([
      { $match: query },
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

    const modelStats = await Transcript.aggregate([
      { $match: query },
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

    res.json({
      summary: stats[0] || {},
      byModel: modelStats
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get LLM configuration
app.get('/api/llm-config', async (req, res) => {
  res.json({
    url: process.env.LLM_URL || 'http://192.168.56.1:1234/v1/chat/completions',
    model: process.env.LLM_MODEL || 'mistralai/mistral-7b-instruct-v0.3',
    useGpu: process.env.LLM_USE_GPU === 'true',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '30000'),
    targetLatencyMs: parseInt(process.env.LLM_TARGET_LATENCY_MS || '2000'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    fallbackModel: process.env.LLM_FALLBACK_MODEL || '',
    confidenceShortcut: parseFloat(process.env.LLM_CONFIDENCE_SHORTCUT || '0.85'),
    heuristicBypass: process.env.LLM_HEURISTIC_BYPASS === 'true'
  });
});

// Update LLM configuration (runtime config, not persisted to .env)
let runtimeConfig = {};
app.post('/api/llm-config', async (req, res) => {
  try {
    runtimeConfig = { ...runtimeConfig, ...req.body };
    res.json({ success: true, config: runtimeConfig });
  } catch (error) {
    console.error('Failed to update config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/llm-config/runtime', async (req, res) => {
  res.json(runtimeConfig);
});

// ===== Intent Log Endpoints =====

// Create a new intent log entry
app.post('/api/intent-logs', async (req, res) => {
  try {
    const intentLog = await IntentLog.create(req.body);
    res.status(201).json(intentLog);
  } catch (error) {
    console.error('Failed to create intent log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get intent logs with pagination and filtering
app.get('/api/intent-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      intent,
      terminalId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (intent) query.intent = intent;
    if (terminalId) query.terminalId = terminalId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const intentLogs = await IntentLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))
      .lean();

    const total = await IntentLog.countDocuments(query);

    res.json({
      intentLogs,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / Number.parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Failed to fetch intent logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get intent statistics
app.get('/api/intent-logs/stats', async (req, res) => {
  try {
    const stats = await IntentLog.aggregate([
      {
        $group: {
          _id: '$intent',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch intent stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Category API Endpoints =====

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ key: 1 }).lean();
    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new category (optional)
app.post('/api/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Failed to create category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint: show DB name and collection counts
app.get('/api/dbinfo', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: 'No DB connection' });

    const collections = await db.listCollections().toArray();
    const result = {};
    for (const c of collections) {
      try {
        const count = await db.collection(c.name).countDocuments();
        result[c.name] = count;
      } catch (e) {
        result[c.name] = { error: e.message };
      }
    }

    res.json({ dbName: db.databaseName, collections: result });
  } catch (error) {
    console.error('Failed to get dbinfo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LLM Instance API Endpoints =====

// Get all LLM instances
app.get('/api/llm-instances', async (req, res) => {
  try {
    const instances = await LlmInstance.find().sort({ createdAt: -1 }).lean();
    res.json(instances);
  } catch (error) {
    console.error('Failed to fetch LLM instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger LLM scan
app.post('/api/llm-instances/scan', async (req, res) => {
  try {
    await scanLlmInstances();
    const instances = await LlmInstance.find().sort({ createdAt: -1 }).lean();
    res.json(instances);
  } catch (error) {
    console.error('Failed to scan LLM instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove duplicate LLM instances
app.post('/api/llm-instances/cleanup', async (req, res) => {
  try {
    const allInstances = await LlmInstance.find();
    const deleted = [];

    // Schritt 1: Entferne exakte URL::Model Duplikate
    const urlModelMap = new Map();
    for (const instance of allInstances) {
      const key = `${instance.url}::${instance.model}`;
      const existing = urlModelMap.get(key);

      if (existing) {
        const toDelete = existing.createdAt < instance.createdAt ? existing : instance;
        const toKeep = existing.createdAt < instance.createdAt ? instance : existing;

        await LlmInstance.findByIdAndDelete(toDelete._id);
        deleted.push({ model: toDelete.model, url: toDelete.url, reason: 'exact duplicate' });
        urlModelMap.set(key, toKeep);
      } else {
        urlModelMap.set(key, instance);
      }
    }

    // Schritt 2: Entferne localhost-Varianten wenn externe IP existiert
    const remainingInstances = await LlmInstance.find();
    const modelMap = new Map();

    for (const instance of remainingInstances) {
      const existing = modelMap.get(instance.model);
      const isLocalhost = instance.url.includes('localhost') || instance.url.includes('127.0.0.1');

      if (existing) {
        const existingIsLocalhost = existing.url.includes('localhost') || existing.url.includes('127.0.0.1');

        // Bevorzuge externe IP über localhost
        if (isLocalhost && !existingIsLocalhost) {
          // Lösche localhost-Variante
          await LlmInstance.findByIdAndDelete(instance._id);
          deleted.push({ model: instance.model, url: instance.url, reason: 'localhost duplicate' });
        } else if (!isLocalhost && existingIsLocalhost) {
          // Lösche alte localhost-Variante, behalte neue externe IP
          await LlmInstance.findByIdAndDelete(existing._id);
          deleted.push({ model: existing.model, url: existing.url, reason: 'localhost duplicate' });
          modelMap.set(instance.model, instance);
        } else {
          // Beide localhost oder beide extern - behalte neuere
          const toDelete = existing.createdAt < instance.createdAt ? existing : instance;
          const toKeep = existing.createdAt < instance.createdAt ? instance : existing;

          if (toDelete._id !== toKeep._id) {
            await LlmInstance.findByIdAndDelete(toDelete._id);
            deleted.push({ model: toDelete.model, url: toDelete.url, reason: 'older duplicate' });
            modelMap.set(instance.model, toKeep);
          }
        }
      } else {
        modelMap.set(instance.model, instance);
      }
    }

    const remaining = await LlmInstance.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      deleted: deleted.length,
      deletedInstances: deleted,
      remaining: remaining
    });
  } catch (error) {
    console.error('Failed to cleanup LLM instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activate an LLM instance (with health check)
app.post('/api/llm-instances/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await LlmInstance.findById(id);

    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }

    // Health check
    let health = 'unknown';
    try {
      const response = await fetch(instance.url.replace('/chat/completions', '/models'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      health = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      health = 'unhealthy';
    }

    if (health !== 'healthy') {
      return res.status(400).json({
        error: 'LLM instance is not healthy',
        health
      });
    }

    // Deactivate all other instances
    await LlmInstance.updateMany({}, { isActive: false });

    // Activate this instance
    instance.isActive = true;
    instance.health = health;
    instance.lastHealthCheck = new Date();
    await instance.save();

    res.json(instance);
  } catch (error) {
    console.error('Failed to activate LLM instance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system prompt for an LLM instance
app.get('/api/llm-instances/:id/system-prompt', async (req, res) => {
  try {
    const instance = await LlmInstance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }
    res.json({ systemPrompt: instance.systemPrompt || getDefaultSystemPrompt() });
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update system prompt for an LLM instance
app.put('/api/llm-instances/:id/system-prompt', async (req, res) => {
  try {
    const { systemPrompt } = req.body;
    const instance = await LlmInstance.findByIdAndUpdate(
      req.params.id,
      { systemPrompt },
      { new: true }
    );

    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }

    res.json(instance);
  } catch (error) {
    console.error('Failed to update system prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Transcript Update Endpoints =====

// Update single transcript
app.put('/api/transcripts/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    console.error('Failed to update transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update transcripts
app.post('/api/transcripts/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || !updates) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await Transcript.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Failed to bulk update transcripts:', error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`HTTP logging server running on port ${port} (accessible from network)`);
});

// WebSocket server shares the HTTP server port. Every received message is
// stored in MongoDB for later analysis. Messages are stored verbatim but
// without additional user data.
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.on('message', async data => {
    await Log.create({ type: 'websocket', message: data.toString(), timestamp: new Date() });
  });
});
