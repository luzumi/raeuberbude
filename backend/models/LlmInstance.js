import mongoose from 'mongoose';

/**
 * Schema für LLM-Instanzen (dynamische Verwaltung statt hardcoded URLs)
 * Instanzen werden automatisch beim Serverstart aus .env gescannt
 */
const llmInstanceSchema = new mongoose.Schema({
  // Name der Instanz (z.B. 'LM Studio Primary', 'Ollama Backup')
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Base URL der Instanz (z.B. 'http://192.168.56.1:1234')
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Aktuelles Modell (wird automatisch beim Scan ermittelt)
  model: {
    type: String,
    default: ''
  },
  
  // Verfügbare Modelle (werden beim Scan ermittelt)
  availableModels: [{
    type: String
  }],
  
  // Ist die Instanz aktiviert? (Admin kann aktivieren/deaktivieren)
  enabled: {
    type: Boolean,
    default: true
  },
  
  // Ist dies die aktuell aktive Instanz? (nur eine kann aktiv sein)
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // System Prompt für diese Instanz
  systemPrompt: {
    type: String,
    default: ''
  },
  
  // Health Status
  health: {
    status: {
      type: String,
      enum: ['unknown', 'healthy', 'unhealthy', 'checking'],
      default: 'unknown'
    },
    lastCheck: {
      type: Date
    },
    lastSuccess: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    responseTimeMs: {
      type: Number
    }
  },
  
  // Konfiguration
  config: {
    timeoutMs: {
      type: Number,
      default: 30000
    },
    maxTokens: {
      type: Number,
      default: 500
    },
    temperature: {
      type: Number,
      default: 0.3
    }
  },
  
  // Statistik
  stats: {
    totalRequests: {
      type: Number,
      default: 0
    },
    successfulRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    avgResponseTimeMs: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastUsed: { type: Date }
});

// Update timestamp on save
llmInstanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index für schnelle Abfragen
llmInstanceSchema.index({ enabled: 1, isActive: 1 });
llmInstanceSchema.index({ 'health.status': 1 });

// Statische Methoden
llmInstanceSchema.statics.findActive = function() {
  return this.findOne({ isActive: true, enabled: true });
};

llmInstanceSchema.statics.findEnabled = function() {
  return this.find({ enabled: true }).sort({ isActive: -1, name: 1 });
};

// Instanzmethoden
llmInstanceSchema.methods.activate = async function() {
  // Deaktiviere alle anderen Instanzen
  await this.constructor.updateMany(
    { _id: { $ne: this._id } },
    { $set: { isActive: false } }
  );
  
  // Aktiviere diese Instanz
  this.isActive = true;
  this.lastUsed = new Date();
  return await this.save();
};

llmInstanceSchema.methods.updateHealth = async function(status, errorMessage = null, responseTimeMs = null) {
  this.health.status = status;
  this.health.lastCheck = new Date();
  if (status === 'healthy') {
    this.health.lastSuccess = new Date();
  }
  if (errorMessage) {
    this.health.errorMessage = errorMessage;
  }
  if (responseTimeMs !== null) {
    this.health.responseTimeMs = responseTimeMs;
  }
  return await this.save();
};

llmInstanceSchema.methods.recordRequest = async function(success, responseTimeMs = null) {
  this.stats.totalRequests += 1;
  if (success) {
    this.stats.successfulRequests += 1;
  } else {
    this.stats.failedRequests += 1;
  }
  
  if (responseTimeMs !== null) {
    // Calculate running average
    const totalTime = this.stats.avgResponseTimeMs * (this.stats.totalRequests - 1) + responseTimeMs;
    this.stats.avgResponseTimeMs = Math.round(totalTime / this.stats.totalRequests);
  }
  
  this.lastUsed = new Date();
  return await this.save();
};

export default mongoose.model('LlmInstance', llmInstanceSchema);
