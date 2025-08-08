import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from a .env file if present
dotenv.config();

(async () => {
  // Use configured URI or default to a local database
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logging';

  try {
    // Establish connection to MongoDB
    await mongoose.connect(mongoUri);

    // Explicitly create the collections required by the logging server.
    // If they already exist, any errors are silently ignored.
    await mongoose.connection.createCollection('logs').catch(() => {});
    await mongoose.connection.createCollection('users').catch(() => {});

    // Index log entries by timestamp for faster chronological queries
    await mongoose.connection.collection('logs').createIndex({ timestamp: 1 }).catch(() => {});

    console.log('Database initialization complete');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
})();
