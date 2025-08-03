const Log = require('./models/log');

// Loggt eine WebSocket-Nachricht in der Datenbank
async function logWebsocketMessage(userId, message, metadata = {}) {
  await Log.create({
    type: 'websocket',
    userId,
    message,
    metadata,
  });
}

// Loggt eine Benutzeraktion in der Datenbank
async function logUserAction(userId, action, metadata = {}) {
  await Log.create({
    type: 'user-action',
    userId,
    message: action,
    metadata,
  });
}

module.exports = { logWebsocketMessage, logUserAction };
