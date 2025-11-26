import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Category = { name: 'Category', schema: CategorySchema };
