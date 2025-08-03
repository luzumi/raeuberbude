import express from 'express';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models used by the server
import Log from './models/Log.js';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB using an environment variable. If the variable is
// not provided a local database is used instead.
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logging';
mongoose.connect(mongoUri).catch(err => {
  console.error('MongoDB connection error', err);
});

// Route to create a user. Only a pseudonymous username is stored.
app.post('/user', async (req, res) => {
  const user = await User.create({ username: req.body.username });
  res.status(201).json({ id: user._id });
});

// Route for logging user actions. The client sends a user identifier and
// a description of the action. Only minimal information is stored to
// respect user privacy.
app.post('/log-action', async (req, res) => {
  const { userId, action, details } = req.body;
  await Log.create({
    userId,
    type: 'action',
    message: `${action}${details ? ': ' + details : ''}`,
    timestamp: new Date()
  });
  res.sendStatus(201);
});

const server = app.listen(3000, () => {
  console.log('HTTP logging server running on port 3000');
});

// WebSocket server shares the HTTP server port. Every received message is
// stored in MongoDB for later analysis. Messages are stored verbatim but
// without additional user data.
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.on('message', async data => {
    await Log.create({ type: 'websocket', message: data.toString(), timestamp: new Date() });
  });
});
