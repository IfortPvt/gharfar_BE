const mongoose = require('mongoose');

const ListingCalendarSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  provider: { type: String, enum: ['airbnb', 'vrbo', 'booking', 'other'], default: 'other' },
  url: { type: String, required: true },
  active: { type: Boolean, default: true },

  // Sync metadata
  lastSyncAt: Date,
  lastEtag: String,
  lastModified: String,
  lastStatus: { type: String, enum: ['success', 'error', 'never'], default: 'never' },
  lastError: String,
  stats: {
    importedEvents: { type: Number, default: 0 },
    removedEvents: { type: Number, default: 0 }
  },

  // Optional export feed token for listing ICS (one can be stored per listing elsewhere too)
  feedToken: { type: String }
}, { timestamps: true });

ListingCalendarSchema.index({ listing: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('ListingCalendar', ListingCalendarSchema);
