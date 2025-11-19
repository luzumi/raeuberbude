import express from 'express';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

// Import models used by the server
import Log from './models/Log.js';
import User from './models/User.js';
import Transcript from './models/Transcript.js'; // Used in API routes below
import IntentLog from './models/IntentLog.js';
import Category from './models/Category.js';
import LlmInstance from './models/LlmInstance.js';

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
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logging';
mongoose.connect(mongoUri).catch(err => {
  console.error('MongoDB connection error', err);
});

// Wait for MongoDB connection before initializing data
mongoose.connection.once('open', async () => {
  console.log('MongoDB connected');
  await initializeCategories();
  await initializeLlmInstances();
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
    const categories = await Category.findActive();
    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new category (optional - for admin to add custom categories)
app.post('/api/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Failed to create category:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LLM Instance API Endpoints =====

// Get all LLM instances
app.get('/api/llm-instances', async (req, res) => {
  try {
    const instances = await LlmInstance.findEnabled();
    res.json(instances);
  } catch (error) {
    console.error('Failed to fetch LLM instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual LLM scan
app.post('/api/llm-instances/scan', async (req, res) => {
  try {
    await scanLlmInstances();
    const instances = await LlmInstance.findEnabled();
    res.json({ success: true, instances });
  } catch (error) {
    console.error('Failed to scan LLM instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activate an LLM instance
app.post('/api/llm-instances/:id/activate', async (req, res) => {
  try {
    const instance = await LlmInstance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }
    
    // Check health before activating
    const isHealthy = await checkLlmHealth(instance);
    if (!isHealthy) {
      return res.status(400).json({ error: 'LLM instance is not healthy' });
    }
    
    await instance.activate();
    res.json({ success: true, instance });
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
    const instance = await LlmInstance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }
    
    instance.systemPrompt = req.body.systemPrompt || '';
    await instance.save();
    
    res.json({ success: true, systemPrompt: instance.systemPrompt });
  } catch (error) {
    console.error('Failed to update system prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test connection to an LLM instance
app.post('/api/llm-instances/:id/test', async (req, res) => {
  try {
    const instance = await LlmInstance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'LLM instance not found' });
    }
    
    const isHealthy = await checkLlmHealth(instance);
    res.json({ 
      success: isHealthy, 
      health: instance.health 
    });
  } catch (error) {
    console.error('Failed to test LLM instance:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LLM Proxy Endpoint (Runtime Adapter) =====

// Central proxy for all LLM requests
app.post('/api/llm/proxy', async (req, res) => {
  try {
    const activeInstance = await LlmInstance.findActive();
    if (!activeInstance) {
      return res.status(503).json({ error: 'No active LLM instance available' });
    }
    
    const startTime = Date.now();
    let response;
    let usedFallback = false;
    
    try {
      // Try primary instance
      response = await axios.post(
        `${activeInstance.url}/v1/chat/completions`,
        req.body,
        {
          timeout: activeInstance.config.timeoutMs,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const responseTime = Date.now() - startTime;
      await activeInstance.recordRequest(true, responseTime);
      
    } catch (primaryError) {
      console.error('Primary LLM failed, trying fallback:', primaryError.message);
      
      // Try fallback if configured
      const fallbackModel = process.env.LLM_FALLBACK_MODEL;
      if (fallbackModel) {
        try {
          const fallbackBody = { ...req.body, model: fallbackModel };
          response = await axios.post(
            `${activeInstance.url}/v1/chat/completions`,
            fallbackBody,
            {
              timeout: activeInstance.config.timeoutMs,
              headers: { 'Content-Type': 'application/json' }
            }
          );
          usedFallback = true;
          
          const responseTime = Date.now() - startTime;
          await activeInstance.recordRequest(true, responseTime);
          
        } catch (fallbackError) {
          await activeInstance.recordRequest(false);
          throw fallbackError;
        }
      } else {
        await activeInstance.recordRequest(false);
        throw primaryError;
      }
    }
    
    res.json({
      ...response.data,
      fallbackUsed: usedFallback,
      responseTimeMs: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('LLM proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Transcript Update Endpoints =====

// Update a single transcript (e.g., category change)
app.put('/api/transcripts/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
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
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    const result = await Transcript.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );
    
    res.json({ 
      success: true, 
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Failed to bulk update transcripts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Helper Functions =====

/**
 * Initialize default categories on server startup
 */
async function initializeCategories() {
  try {
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      console.log(`Categories already initialized (${existingCount} categories found)`);
      return;
    }
    
    const defaultCategories = [
      { 
        key: 'home_assistant_command', 
        label: 'Home Assistant Befehl',
        description: 'Befehle zur Steuerung von Smart Home Geräten',
        icon: 'power_settings_new',
        color: '#4caf50',
        sortOrder: 1
      },
      { 
        key: 'home_assistant_query', 
        label: 'Home Assistant Abfrage',
        description: 'Abfragen zum Status von Smart Home Geräten',
        icon: 'info',
        color: '#2196f3',
        sortOrder: 2
      },
      { 
        key: 'home_assistant_queryautomation', 
        label: 'Home Assistant Automation',
        description: 'Abfragen zu Automationen',
        icon: 'settings_suggest',
        color: '#9c27b0',
        sortOrder: 3
      },
      { 
        key: 'navigation', 
        label: 'Navigation',
        description: 'Navigation innerhalb der App',
        icon: 'navigation',
        color: '#ff9800',
        sortOrder: 4
      },
      { 
        key: 'web_search', 
        label: 'Web-Suche',
        description: 'Suche im Internet',
        icon: 'search',
        color: '#00bcd4',
        sortOrder: 5
      },
      { 
        key: 'greeting', 
        label: 'Begrüßung',
        description: 'Begrüßungen und höfliche Phrasen',
        icon: 'waving_hand',
        color: '#ffc107',
        sortOrder: 6
      },
      { 
        key: 'general_question', 
        label: 'Allgemeine Frage',
        description: 'Allgemeine Fragen',
        icon: 'question_mark',
        color: '#607d8b',
        sortOrder: 7
      },
      { 
        key: 'unknown', 
        label: 'Unbekannt',
        description: 'Nicht kategorisiert',
        icon: 'help',
        color: '#9e9e9e',
        sortOrder: 8
      }
    ];
    
    await Category.insertMany(defaultCategories);
    console.log(`Initialized ${defaultCategories.length} default categories`);
  } catch (error) {
    console.error('Failed to initialize categories:', error);
  }
}

/**
 * Scan and initialize LLM instances from .env
 */
async function initializeLlmInstances() {
  try {
    await scanLlmInstances();
  } catch (error) {
    console.error('Failed to initialize LLM instances:', error);
  }
}

/**
 * Scan LLM URLs from environment and update database
 */
async function scanLlmInstances() {
  const llmUrls = process.env.LLM_URLS || process.env.LLM_URL || '';
  if (!llmUrls) {
    console.warn('No LLM_URLS configured in .env');
    return;
  }
  
  const urls = llmUrls.split(',').map(url => url.trim()).filter(url => url);
  console.log(`Scanning ${urls.length} LLM instance(s)...`);
  
  for (const url of urls) {
    try {
      // Try to get available models
      const modelsResponse = await axios.get(`${url}/v1/models`, { timeout: 5000 });
      const models = modelsResponse.data?.data || [];
      const modelNames = models.map(m => m.id || m.name).filter(Boolean);
      
      // Check if instance exists
      let instance = await LlmInstance.findOne({ url });
      
      if (instance) {
        // Update existing instance
        instance.availableModels = modelNames;
        instance.model = modelNames[0] || instance.model;
        await instance.updateHealth('healthy', null, modelsResponse.status === 200 ? 100 : null);
        console.log(`Updated LLM instance: ${url}`);
      } else {
        // Create new instance
        instance = await LlmInstance.create({
          name: `LLM Instance ${url}`,
          url,
          model: modelNames[0] || process.env.LLM_MODEL || '',
          availableModels: modelNames,
          enabled: true,
          isActive: false, // First instance will be activated below
          health: {
            status: 'healthy',
            lastCheck: new Date(),
            lastSuccess: new Date()
          }
        });
        console.log(`Created new LLM instance: ${url}`);
      }
    } catch (error) {
      console.error(`Failed to scan LLM at ${url}:`, error.message);
      
      // Create/update with unhealthy status
      let instance = await LlmInstance.findOne({ url });
      if (instance) {
        await instance.updateHealth('unhealthy', error.message);
      } else {
        await LlmInstance.create({
          name: `LLM Instance ${url}`,
          url,
          enabled: false,
          health: {
            status: 'unhealthy',
            lastCheck: new Date(),
            errorMessage: error.message
          }
        });
      }
    }
  }
  
  // Ensure at least one instance is active
  const activeInstance = await LlmInstance.findActive();
  if (!activeInstance) {
    const firstHealthy = await LlmInstance.findOne({ 
      enabled: true, 
      'health.status': 'healthy' 
    });
    
    if (firstHealthy) {
      await firstHealthy.activate();
      console.log(`Activated first healthy LLM instance: ${firstHealthy.url}`);
    }
  }
}

/**
 * Check health of an LLM instance
 */
async function checkLlmHealth(instance) {
  try {
    await instance.updateHealth('checking');
    
    const startTime = Date.now();
    await axios.get(`${instance.url}/v1/models`, { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    await instance.updateHealth('healthy', null, responseTime);
    return true;
  } catch (error) {
    await instance.updateHealth('unhealthy', error.message);
    return false;
  }
}

/**
 * Get default system prompt
 */
function getDefaultSystemPrompt() {
  return `Du bist ein hilfreicher, zuverlässiger und sicherheitsbewusster Assistenz‑LLM für die Steuerung und Abfragen eines Smart‑Home‑Systems (Home Assistant). Deine Hauptaufgabe ist es, natürliche Sprachanfragen korrekt zu interpretieren und – wenn erforderlich – in klar strukturierten Aktionen für das Smart‑Home‑Backend zu überführen. Antworte stets auf Deutsch, prägnant und nur so ausführlich wie nötig. Frage nur dann nach, wenn die Anfrage unklar ist oder essenzielle Informationen für die Ausführung fehlen.

Regeln und Erwartungen:
1. Rolle: Handele als Vermittler zwischen Benutzerwunsch (Natürliche Sprache) und Home‑Assistant‑Aktionen. Sei verantwortungsbewusst: gib niemals gefährliche oder nicht-autorisierte Handlungsanweisungen.
2. Format: Wenn die Anfrage eine ausführbare Aktion verlangt (z. B. „Licht an"), liefere zwei Dinge:
   a) Ein human‑lesbares, kurzes Resümee (1–2 Sätze), z. B. „Ich schalte das Wohnzimmerlicht ein."  
   b) Eine strukturierte Aktionsbeschreibung als JSON (siehe Schema unten). Diese wird vom Backend direkt verwendet.
3. Nachfragen: Wenn es mindestens eine fehlende kritische Information gibt (z. B. welches Gerät, welcher Raum, welcher Zielwert), stelle eine kurze Rückfrage (1 Satz). Beispiel: „Welches Licht im Wohnzimmer meinst du — Deckenlampe oder Stehlampe?"
4. Sicherheit & Defaults:  
   - Ändere keine kritischen Systemeinstellungen (z. B. Alarmanlage deaktivieren) ohne ausdrückliche Bestätigung vom Benutzer.  
   - Falls ein Wert außerhalb normaler Grenzen liegt (z. B. Thermostat auf 40°C), bitte um Bestätigung.
5. Sprache und Markup:  
   - Menschenlesbare Teile normal schreiben.  
   - Inline technische Bezeichner (Entity‑IDs, Service‑Names) in backticks (\`like_this\`) ausgeben.  
   - JSON strikt validieren; benutze nur das vorgegebene Schema für ausführbare Aktionen.

JSON‑Schema für ausführbare Aktionen:
{
  "action": "string",
  "target": {
    "entity_id": "string",
    "type": "string",
    "name": "string"
  },
  "parameters": {
    "brightness": 80,
    "color": "warm_white",
    "temperature": 21,
    "preset": "eco"
  },
  "explain": "string",
  "require_confirmation": boolean
}`;
}

const server = app.listen(3000, '0.0.0.0', () => {
  console.log('HTTP logging server running on port 3000 (accessible from network)');
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
