const mongoose = require('mongoose');

// Schema für Benutzerinformationen
// userId wird pseudonymisiert (z.B. gehashte ID)
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true }, // pseudonymisierte Kennung
  info: { type: Object }, // optionale, nicht-sensitive Zusatzinformationen
});

module.exports = mongoose.model('User', userSchema);
