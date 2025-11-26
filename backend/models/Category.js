import mongoose from 'mongoose';

/**
 * Schema für Intent-Kategorien
 * Speichert verfügbare Kategorien für die Klassifizierung von Transcripts
 */
const categorySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  label: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Category', categorySchema);

