import mongoose from 'mongoose';

/**
 * Schema für dynamische Kategorien (ersetzt hardcoded Kategorien im Frontend)
 * Kategorien werden beim Serverstart initial angelegt
 */
const categorySchema = new mongoose.Schema({
  // Eindeutiger Schlüssel (z.B. 'home_assistant_command')
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    lowercase: true,
    trim: true
  },
  
  // Anzeigename (z.B. 'Home Assistant Befehl')
  label: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Optional: Beschreibung
  description: { 
    type: String,
    default: ''
  },
  
  // Optional: Icon name (für UI)
  icon: {
    type: String,
    default: 'category'
  },
  
  // Optional: Farbe (für UI)
  color: {
    type: String,
    default: '#2196f3'
  },
  
  // Sortierreihenfolge
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Ist aktiv (kann deaktiviert werden ohne zu löschen)
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
categorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Nur aktive Kategorien standardmäßig abrufen
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, label: 1 });
};

export default mongoose.model('Category', categorySchema);
