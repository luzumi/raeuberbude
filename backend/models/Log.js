import mongoose from 'mongoose';

// Schema for stored log entries. Only minimal information is stored
// to comply with privacy requirements.
const logSchema = new mongoose.Schema({
  userId: String, // anonymised user identifier
  type: { type: String, enum: ['websocket', 'action'], required: true },
  message: String, // message payload or action description
  timestamp: { type: Date, default: Date.now } // creation time of the log entry
});

export default mongoose.model('Log', logSchema);
