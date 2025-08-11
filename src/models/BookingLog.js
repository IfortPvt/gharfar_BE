const mongoose = require('mongoose');

const bookingLogSchema = new mongoose.Schema({
  // Log identification
  logId: {
    type: String,
    unique: true,
    index: true
  },
  
  // Related entities
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  
  // Log details
  action: {
    type: String,
    enum: [
      'booking_created',
      'booking_confirmed',
      'booking_declined',
      'booking_cancelled',
      'booking_expired',
      'status_updated',
      'payment_updated',
      'check_in',
      'check_out',
      'availability_blocked',
      'availability_released',
      'host_response_added',
      'guest_message_added',
      'review_submitted',
      'refund_processed',
      'damage_reported'
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
    name: String // For quick reference
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
    guestNotified: {
      type: Boolean,
      default: false
    },
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
  
  tags: [String], // For categorizing logs
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
bookingLogSchema.index({ booking: 1, timestamp: -1 });
bookingLogSchema.index({ action: 1, timestamp: -1 });
bookingLogSchema.index({ 'performedBy.user': 1, timestamp: -1 });
bookingLogSchema.index({ 'performedBy.role': 1, timestamp: -1 });
bookingLogSchema.index({ severity: 1, timestamp: -1 });
bookingLogSchema.index({ tags: 1 });

// Pre-save middleware to generate log ID
bookingLogSchema.pre('save', async function(next) {
  if (!this.logId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0') + 
                   date.getHours().toString().padStart(2, '0') + 
                   date.getMinutes().toString().padStart(2, '0');
    
    // Generate unique 4-digit number
    let isUnique = false;
    let logId;
    
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      logId = `BLG-${dateStr}-${randomNum}`;
      
      // Check if this ID already exists
      const existingLog = await this.constructor.findOne({ logId });
      if (!existingLog) {
        isUnique = true;
      }
    }
    
    this.logId = logId;
  }
  
  next();
});

// Static methods for common queries
bookingLogSchema.statics.findByBooking = function(bookingId, limit = 50) {
  return this.find({ booking: bookingId }).limit(limit).sort({ timestamp: -1 });
};

bookingLogSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ 'performedBy.user': userId }).limit(limit).sort({ timestamp: -1 });
};

bookingLogSchema.statics.findByAction = function(action, limit = 100) {
  return this.find({ action }).limit(limit).sort({ timestamp: -1 });
};

bookingLogSchema.statics.findCriticalLogs = function(limit = 20) {
  return this.find({ severity: 'critical' }).limit(limit).sort({ timestamp: -1 });
};

bookingLogSchema.statics.findRecentActivity = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ timestamp: { $gte: since } }).limit(limit).sort({ timestamp: -1 });
};

bookingLogSchema.statics.findSystemActions = function(limit = 50) {
  return this.find({ 'performedBy.role': 'system' }).limit(limit).sort({ timestamp: -1 });
};

// Instance methods
bookingLogSchema.methods.isCritical = function() {
  return this.severity === 'critical';
};

bookingLogSchema.methods.isSystemAction = function() {
  return this.performedBy.role === 'system';
};

bookingLogSchema.methods.requiresNotification = function() {
  return !this.notifications.guestNotified || !this.notifications.hostNotified;
};

module.exports = mongoose.model('BookingLog', bookingLogSchema);
