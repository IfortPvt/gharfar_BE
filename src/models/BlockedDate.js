const mongoose = require('mongoose');

const BlockedDateSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  source: { type: String, enum: ['internal', 'external'], default: 'internal' },
  provider: { type: String, enum: ['airbnb', 'vrbo', 'booking', 'other'], default: 'other' },
  eventUid: { type: String },
  summary: { type: String },
  description: { type: String },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  isAllDay: { type: Boolean, default: false },
  raw: { type: Object },
  importedAt: { type: Date },
  deletedAt: { type: Date }
}, { timestamps: true });

BlockedDateSchema.index({ listing: 1, start: 1, end: 1, source: 1, provider: 1 });
BlockedDateSchema.index({ listing: 1, eventUid: 1 }, { unique: true, partialFilterExpression: { eventUid: { $exists: true, $ne: null } } });

module.exports = mongoose.model('BlockedDate', BlockedDateSchema);
