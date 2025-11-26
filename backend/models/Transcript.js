import mongoose from 'mongoose';

/**
 * Schema für Sprach-Transkriptions-Anfragen
 * Speichert Details zu jeder STT+LLM Validierung inkl. Performance-Metriken
 */
const transcriptSchema = new mongoose.Schema({
  // User & Terminal Context
  userId: { type: String, required: true, index: true },
  terminalId: { type: String, index: true },

  // Audio & Transcription
  audioBlobRef: { type: String }, // Optional: Referenz zu gespeichertem Audio-Blob
  transcript: { type: String, required: true }, // Original STT Output
  sttConfidence: { type: Number, min: 0, max: 1 }, // Original STT Confidence

  // LLM Processing
  aiAdjustedText: { type: String }, // Von LLM korrigierter/verbesserter Text
  suggestions: [{ type: String }], // LLM Vorschläge bei Unklarheit
  suggestionFlag: { type: Boolean, default: false }, // True wenn Kauderwelsch erkannt

  // Intent Recognition
  category: {
    type: String,
    enum: ['home_assistant_command', 'home_assistant_query', 'navigation', 'web_search', 'greeting', 'general_question', 'unknown'],
    index: true
  },
  intent: { type: Object }, // Komplettes Intent-Objekt

  // Validation Results
  isValid: { type: Boolean, required: true },
  confidence: { type: Number, min: 0, max: 1 },
  hasAmbiguity: { type: Boolean, default: false },
  clarificationNeeded: { type: Boolean, default: false },
  clarificationQuestion: { type: String },

  // Performance Metrics
  durationMs: { type: Number, required: true }, // Gesamt-Latenz
  timings: {
    sttMs: { type: Number }, // Zeit für STT
    preProcessMs: { type: Number }, // Zeit für Heuristik-Checks
    llmMs: { type: Number }, // Zeit für LLM-Inferenz
    dbMs: { type: Number }, // Zeit für DB-Speicherung
    networkMs: { type: Number } // Netzwerk-Latenz zu LM Studio
  },

  // LLM Configuration (für Reproduzierbarkeit)
  model: { type: String, required: true, index: true }, // z.B. 'mistralai/mistral-7b-instruct-v0.3'
  llmUrl: { type: String }, // LM Studio URL
  llmProvider: { type: String, enum: ['lmstudio', 'openai', 'anthropic', 'local'], default: 'lmstudio' },
  temperature: { type: Number },
  maxTokens: { type: Number },

  // Raw Data (für Debugging)
  rawResponse: { type: Object }, // Komplette LLM Response
  error: { type: String }, // Fehler falls aufgetreten
  fallbackUsed: { type: Boolean, default: false }, // True wenn Fallback statt primärem LLM

  // Metadata
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Compound Indexes für häufige Queries
transcriptSchema.index({ userId: 1, createdAt: -1 });
transcriptSchema.index({ terminalId: 1, createdAt: -1 });
transcriptSchema.index({ model: 1, createdAt: -1 });
transcriptSchema.index({ category: 1, createdAt: -1 });
transcriptSchema.index({ isValid: 1, createdAt: -1 });

// Update timestamp on save
transcriptSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Transcript', transcriptSchema);

