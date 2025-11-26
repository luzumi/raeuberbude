import mongoose from 'mongoose';

/**
 * Schema für LLM-Instanzen
 * Verwaltet verfügbare LLM-Server und deren Konfiguration
 */
const llmInstanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  systemPrompt: {
    type: String,
    default: ''
  },
  health: {
    type: String,
    enum: ['healthy', 'unhealthy', 'unknown'],
    default: 'unknown'
  },
  lastHealthCheck: {
    type: Date
  },
  config: {
    temperature: { type: Number, default: 0.3 },
    maxTokens: { type: Number, default: 500 },
    timeoutMs: { type: Number, default: 30000 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index für schnelle Abfrage der aktiven Instanz
llmInstanceSchema.index({ isActive: 1 });

export default mongoose.model('LlmInstance', llmInstanceSchema);

