import mongoose from 'mongoose';

export const TranscriptSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  terminalId: { type: String, index: true },
  audioBlobRef: { type: String },
  transcript: { type: String, required: true },
  sttConfidence: { type: Number, min: 0, max: 1 },
  aiAdjustedText: { type: String },
  suggestions: [{ type: String }],
  suggestionFlag: { type: Boolean, default: false },
  category: { type: String, index: true },
  intent: { type: Object },
  isValid: { type: Boolean, required: true },
  confidence: { type: Number, min: 0, max: 1 },
  hasAmbiguity: { type: Boolean, default: false },
  clarificationNeeded: { type: Boolean, default: false },
  clarificationQuestion: { type: String },
  durationMs: { type: Number, required: true },
  timings: {
    sttMs: { type: Number },
    preProcessMs: { type: Number },
    llmMs: { type: Number },
    dbMs: { type: Number },
    networkMs: { type: Number }
  },
  model: { type: String, required: true, index: true },
  llmUrl: { type: String },
  llmProvider: { type: String, default: 'lmstudio' },
  temperature: { type: Number },
  maxTokens: { type: Number },
  rawResponse: { type: Object },
  error: { type: String },
  fallbackUsed: { type: Boolean, default: false },
  // Home Assistant Assignment fields
  assignedAreaId: { type: String, index: true },
  assignedEntityId: { type: String, index: true },
  assignedAction: {
    type: {
      type: String,
      label: String,
      params: Object
    }
  },
  assignedTrigger: { type: String },
  assignedTriggerAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

TranscriptSchema.index({ userId: 1, createdAt: -1 });
TranscriptSchema.index({ terminalId: 1, createdAt: -1 });
TranscriptSchema.index({ model: 1, createdAt: -1 });
TranscriptSchema.index({ category: 1, createdAt: -1 });
TranscriptSchema.index({ isValid: 1, createdAt: -1 });

TranscriptSchema.pre('save', function (next: any) {
  (this as any).updatedAt = new Date();
  next();
});

export const Transcript = { name: 'Transcript', schema: TranscriptSchema };
