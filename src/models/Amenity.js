const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  key: { type: String, required: true, unique: true }, // URL-friendly key for FE integration
  icon: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'essentials',      // WiFi, Kitchen, Heating, etc.
      'features',        // Pool, Gym, Balcony, etc.
      'safety',          // Smoke alarm, First aid, etc.
      'accessibility',   // Wheelchair accessible, etc.
      'bathroom',        // Hair dryer, Toiletries, etc.
      'bedroom',         // Bed linens, Extra pillows, etc.
      'entertainment',   // TV, Sound system, etc.
      'outdoor',         // Patio, BBQ grill, etc.
      'parking',         // Free parking, Garage, etc.
      'services',        // Cleaning service, Concierge, etc.
      'pet',             // Pet bed, Food bowls, etc.
      'business'         // Dedicated workspace, Printer, etc.
    ],
    required: true
  },
  subcategory: { type: String }, // Optional subcategory for better organization
  description: { type: String },
  isActive: { type: Boolean, default: true },
  isCommon: { type: Boolean, default: true }, // If true, commonly available amenity
  sortOrder: { type: Number, default: 0 }, // For ordering in UI
  
  // For better UX - what this amenity enables or provides
  benefits: [{ type: String }],
  
  // Metadata for different listing types
  applicableFor: [{
    type: String,
    enum: ['Home', 'Experience', 'Service'],
    default: ['Home', 'Experience', 'Service']
  }]
}, { timestamps: true });

// Indexes for better query performance
amenitySchema.index({ category: 1, isActive: 1 });
amenitySchema.index({ sortOrder: 1 });
amenitySchema.index({ isCommon: 1, category: 1 });

module.exports = mongoose.model('Amenity', amenitySchema);
