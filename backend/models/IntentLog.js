import mongoose from 'mongoose';

const intentLogSchema = new mongoose.Schema({
  timestamp: {
    type: String,
    required: true,
    index: true
  },
  transcript: {
    type: String,
    required: true
  },
  intent: {
    type: String,
    required: true,
    index: true
  },
  summary: String,
  keywords: [String],
  confidence: Number,
  terminalId: {
    type: String,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index für schnelle Queries
intentLogSchema.index({ createdAt: -1 });
intentLogSchema.index({ intent: 1, createdAt: -1 });
intentLogSchema.index({ terminalId: 1, createdAt: -1 });

export default mongoose.model('IntentLog', intentLogSchema);

