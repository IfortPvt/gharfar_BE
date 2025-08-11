const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({
  // Log identification
  logId: {
    type: String,
    unique: true,
    index: true
  },
  
  // Related entities
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Log details
  action: {
    type: String,
    enum: [
      'payment_initiated',
      'payment_processing',
      'payment_succeeded',
      'payment_failed',
      'payment_cancelled',
      'refund_initiated',
      'refund_processed',
      'refund_failed',
      'chargeback_received',
      'dispute_created',
      'webhook_received',
      'status_updated'
    ],
    required: true,
    index: true
  },
  
  // Status change
  previousStatus: String,
  newStatus: String,
  
  // Request/Response data
  requestData: {
    endpoint: String,
    method: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    timestamp: Date
  },
  
  responseData: {
    statusCode: Number,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    timestamp: Date,
    responseTime: Number // in milliseconds
  },
  
  // Provider specific data
  providerData: {
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'bank', 'internal'],
      required: true
    },
    webhookId: String,
    eventId: String,
    transactionId: String,
    errorCode: String,
    errorMessage: String
  },
  
  // Log metadata
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'debug'],
    default: 'info',
    index: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  // User context
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin or system user who triggered the action
  },
  
  ipAddress: String,
  userAgent: String,
  
  // Additional context
  additionalData: mongoose.Schema.Types.Mixed,
  
  // System information
  serverTimestamp: {
    type: Date,
    default: Date.now
  },
  
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  }
}, {
  timestamps: true
});

// Indexes for performance and querying
paymentLogSchema.index({ payment: 1, createdAt: -1 });
paymentLogSchema.index({ booking: 1, action: 1 });
paymentLogSchema.index({ action: 1, createdAt: -1 });
paymentLogSchema.index({ level: 1, createdAt: -1 });
paymentLogSchema.index({ 'providerData.provider': 1, createdAt: -1 });
paymentLogSchema.index({ 'providerData.eventId': 1 });
paymentLogSchema.index({ createdAt: -1 }); // For general log browsing

// Pre-save middleware to generate log ID
paymentLogSchema.pre('save', async function(next) {
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
      logId = `LOG-${dateStr}-${randomNum}`;
      
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
paymentLogSchema.statics.findByPayment = function(paymentId) {
  return this.find({ payment: paymentId }).sort({ createdAt: -1 });
};

paymentLogSchema.statics.findByBooking = function(bookingId) {
  return this.find({ booking: bookingId }).sort({ createdAt: -1 });
};

paymentLogSchema.statics.findByAction = function(action, limit = 100) {
  return this.find({ action }).limit(limit).sort({ createdAt: -1 });
};

paymentLogSchema.statics.findErrors = function(limit = 50) {
  return this.find({ level: 'error' }).limit(limit).sort({ createdAt: -1 });
};

paymentLogSchema.statics.findByProvider = function(provider, limit = 100) {
  return this.find({ 'providerData.provider': provider }).limit(limit).sort({ createdAt: -1 });
};

paymentLogSchema.statics.findRecentLogs = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: since } }).limit(limit).sort({ createdAt: -1 });
};

// Instance methods
paymentLogSchema.methods.isError = function() {
  return this.level === 'error';
};

paymentLogSchema.methods.isWebhook = function() {
  return this.action === 'webhook_received';
};

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
