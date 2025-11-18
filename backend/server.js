import express from 'express';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Import models used by the server
import Log from './models/Log.js';
import User from './models/User.js';
import Transcript from './models/Transcript.js'; // Used in API routes below
import IntentLog from './models/IntentLog.js';

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
