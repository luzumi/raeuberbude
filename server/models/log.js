const mongoose = require('mongoose');

// Schema für Logeinträge
// Enthält Typ, optionalen Benutzer und optionale Zusatzdaten
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now }, // Zeitpunkt des Ereignisses
  type: { type: String, enum: ['websocket', 'user-action'], required: true }, // Art des Logs
  userId: { type: String }, // Optional: referenzierter Benutzer (pseudonymisiert)
  message: { type: String }, // Nachricht oder Aktion
  metadata: { type: Object }, // Zusätzliche Informationen
});

module.exports = mongoose.model('Log', logSchema);
