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
    timeoutMs: { type: Number, default: 30000 },
    targetLatencyMs: { type: Number, default: 2000 },
    confidenceShortcut: { type: Number, default: 0.85 },
    useGpu: { type: Boolean, default: true },
    heuristicBypass: { type: Boolean, default: false },
    fallbackModel: { type: String, default: '' },
    // LM-Studio specific sampling fields
    topK: { type: Number },
    topP: { type: Number },
    repeatPenalty: { type: Number },
    minPSampling: { type: Number },
    // LM-Studio specific performance fields
    contextLength: { type: Number },
    evalBatchSize: { type: Number },
    cpuThreads: { type: Number },
    gpuOffload: { type: Boolean },
    keepModelInMemory: { type: Boolean },
    flashAttention: { type: Boolean },
    kCacheQuant: { type: Boolean },
    vCacheQuant: { type: Boolean }
  },
  createdAt: { type: Date, default: Date.now }
});

LlmInstanceSchema.index({ isActive: 1 });

export const LlmInstance = { name: 'LlmInstance', schema: LlmInstanceSchema };
