const crypto = require('crypto');
const Log = require('./models/log');

// Pseudonymisiert die Benutzer-ID per SHA-256, um den Datenschutz zu wahren
function anonymizeUserId(userId) {
  if (!userId) return null;
  return crypto.createHash('sha256').update(userId).digest('hex');
}

// Entfernt ggf. sensible Felder aus Metadaten
function sanitizeMetadata(metadata) {
  if (!metadata) return {};
  const clone = { ...metadata };
  if (clone.sensitive) delete clone.sensitive; // sensibles Feld verwerfen
  return clone;
}

// Loggt eine WebSocket-Nachricht in der Datenbank
async function logWebsocketMessage(userId, message, metadata = {}) {
  await Log.create({
    type: 'websocket',
    userId: anonymizeUserId(userId),
    message,
    metadata: sanitizeMetadata(metadata),
  });
}

// Loggt eine Benutzeraktion in der Datenbank
async function logUserAction(userId, action, metadata = {}) {
  await Log.create({
    type: 'user-action',
    userId: anonymizeUserId(userId),
    message: action,
    metadata: sanitizeMetadata(metadata),
  });
}
module.exports = { logWebsocketMessage, logUserAction, anonymizeUserId };
