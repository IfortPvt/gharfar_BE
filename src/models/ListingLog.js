const mongoose = require('mongoose');

const listingLogSchema = new mongoose.Schema({
  // Log identification
  logId: {
    type: String,
    unique: true,
    index: true
  },

  // Related entity
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true
  },

  // Log details
  action: {
    type: String,
    enum: [
      'listing_created',
      'status_updated',
      'listing_deleted',
      'bulk_status_update',
      'image_updated',
      'image_deleted',
      'image_flagged',
      'image_reviewed'
    ],
    required: true,
    index: true
  },

  // Status change tracking
  previousStatus: String,
  newStatus: String,

  // User who performed the action
  performedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['guest', 'host', 'admin', 'system'],
      required: true
    },
    name: String // quick reference
  },

  // Action details
  details: {
    message: String,
    reason: String,
    additionalInfo: mongoose.Schema.Types.Mixed,
    automaticAction: {
      type: Boolean,
      default: false
    }
  },

  // Changes made
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],

  // System context
  systemInfo: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'api', 'webhook', 'cron'],
      default: 'web'
    },
    endpoint: String,
    requestId: String
  },

  // Notification status
  notifications: {
    hostNotified: {
      type: Boolean,
      default: false
    },
    adminNotified: {
      type: Boolean,
      default: false
    },
    notificationsSentAt: Date
  },

  // Metadata
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  tags: [String],

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Indexes for performance
listingLogSchema.index({ listing: 1, timestamp: -1 });
listingLogSchema.index({ action: 1, timestamp: -1 });
listingLogSchema.index({ 'performedBy.user': 1, timestamp: -1 });
listingLogSchema.index({ 'performedBy.role': 1, timestamp: -1 });
listingLogSchema.index({ severity: 1, timestamp: -1 });
listingLogSchema.index({ tags: 1 });

// Pre-save middleware to generate log ID
listingLogSchema.pre('save', async function(next) {
  if (!this.logId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0') +
                   date.getHours().toString().padStart(2, '0') +
                   date.getMinutes().toString().padStart(2, '0');

    let isUnique = false;
    let logId;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      logId = `LLG-${dateStr}-${randomNum}`;

      const existingLog = await this.constructor.findOne({ logId });
      if (!existingLog) {
        isUnique = true;
      }
    }

    this.logId = logId;
  }

  next();
});

// Static helpers
listingLogSchema.statics.findByListing = function(listingId, limit = 50) {
  return this.find({ listing: listingId }).limit(limit).sort({ timestamp: -1 });
};

listingLogSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ 'performedBy.user': userId }).limit(limit).sort({ timestamp: -1 });
};

module.exports = mongoose.model('ListingLog', listingLogSchema);
