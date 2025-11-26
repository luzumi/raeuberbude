import mongoose from 'mongoose';

const IntentLogSchema = new mongoose.Schema({
  timestamp: { type: String, required: true, index: true },
  transcript: { type: String, required: true },
  intent: { type: String, required: true, index: true },
  summary: String,
  keywords: [String],
  confidence: Number,
  terminalId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

IntentLogSchema.index({ createdAt: -1 });
IntentLogSchema.index({ intent: 1, createdAt: -1 });
IntentLogSchema.index({ terminalId: 1, createdAt: -1 });

export const IntentLog = { name: 'IntentLog', schema: IntentLogSchema };
