const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isMainImage: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

// Ensure only one main image per listing
imageSchema.index({ listing: 1, isMainImage: 1 }, {
  unique: true,
  partialFilterExpression: { isMainImage: true }
});

// Ensure only one featured image per listing
imageSchema.index({ listing: 1, isFeatured: 1 }, {
  unique: true,
  partialFilterExpression: { isFeatured: true }
});

module.exports = mongoose.model('Image', imageSchema);
