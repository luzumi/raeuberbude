import mongoose from 'mongoose';
import Log from './models/Log.js';
import User from './models/User.js';

// Ensures the required MongoDB collections and indexes exist.
// Run this script once before starting the server to create the
// `logs` and `users` collections if they are missing.
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logging';

async function init() {
  await mongoose.connect(mongoUri);
  // Initialize models to create collections and indexes
  await Log.init();
  await User.init();
  console.log('MongoDB collections ready');
  await mongoose.disconnect();
}

init().catch(err => {
  console.error('Database initialization failed', err);
  process.exit(1);
});
