const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const { logWebsocketMessage, logUserAction, anonymizeUserId } = require('./logger');
const User = require('./models/user');
require('dotenv').config();

const app = express();
app.use(express.json());

// Einfache Sanitizing-Middleware zur Wahrung der Privatsphäre
app.use((req, _res, next) => {
  if (req.body && req.body.sensitive) {
    delete req.body.sensitive; // sensiblen Inhalt entfernen
  }
  next();
});

// Verbindung zur MongoDB herstellen
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// REST-Endpunkt zum Loggen von Benutzeraktionen
app.post('/logs/user-action', async (req, res) => {
  await logUserAction(req.body.userId, req.body.action, req.body.metadata);
  res.status(201).json({ status: 'ok' });
});

// Einfacher Endpunkt zum Speichern/Pseudonymisieren von Benutzern
app.post('/users', async (req, res) => {
  const { userId, info } = req.body;
  const hashedId = anonymizeUserId(userId); // Nutzer anonymisieren
  await User.findOneAndUpdate(
    { userId: hashedId },
    { info },
    { upsert: true, new: true }
  );
  res.status(201).json({ status: 'ok', userId: hashedId });
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Logging-Server läuft auf Port ${port}`);
});

// WebSocket-Server zum Abfangen und Loggen von Nachrichten
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  ws.on('message', msg => {
    // WebSocket-Nachricht loggen, Benutzer-ID könnte z.B. über ein Token kommen
    logWebsocketMessage(null, msg.toString());
  });
});
