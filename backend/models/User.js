import mongoose from 'mongoose';

// Simple user model storing only non-sensitive information.
const userSchema = new mongoose.Schema({
  username: String, // pseudonym chosen by the user
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
