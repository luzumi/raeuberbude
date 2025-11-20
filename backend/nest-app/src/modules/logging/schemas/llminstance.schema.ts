import mongoose from 'mongoose';

const LlmInstanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  model: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: false },
  systemPrompt: { type: String, default: '' },
  health: { type: String, enum: ['healthy', 'unhealthy', 'unknown'], default: 'unknown' },
  lastHealthCheck: { type: Date },
  config: {
    temperature: { type: Number, default: 0.3 },
    maxTokens: { type: Number, default: 500 },
    timeoutMs: { type: Number, default: 30000 }
  },
  createdAt: { type: Date, default: Date.now }
});

LlmInstanceSchema.index({ isActive: 1 });

export const LlmInstance = { name: 'LlmInstance', schema: LlmInstanceSchema };
