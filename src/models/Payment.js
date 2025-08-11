const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Payment identification
  paymentId: {
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Payment method and provider
  paymentMethod: {
    type: String,
    enum: ['stripe_card', 'stripe_bank', 'paypal', 'bank_transfer', 'wallet'],
    required: true
  },
  provider: {
    type: String,
    enum: ['stripe', 'paypal', 'bank', 'internal'],
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: [
      'pending',           // Payment initiated but not completed
      'processing',        // Being processed by payment provider
      'succeeded',         // Payment successful
      'failed',           // Payment failed
      'cancelled',        // Cancelled by user
      'refunded',         // Full refund processed
      'partially_refunded', // Partial refund processed
      'disputed',         // Payment disputed/chargeback
      'expired'           // Payment session expired
    ],
    default: 'pending',
    index: true
  },
  
  // Provider-specific data
  providerData: {
    // Stripe specific
    stripePaymentIntentId: String,
    stripeClientSecret: String,
    stripeChargeId: String,
    stripeCustomerId: String,
    
    // PayPal specific (for future)
    paypalOrderId: String,
    paypalPaymentId: String,
    
    // Bank transfer specific (for future)
    bankTransferReference: String,
    
    // Generic provider response
    providerTransactionId: String,
    providerStatus: String
  },
  
  // Payment breakdown
  breakdown: {
    baseAmount: { type: Number, required: true },
    cleaningFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    petFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 }
  },
  
  // Payment metadata
  paymentType: {
    type: String,
    enum: ['booking_payment', 'additional_charges', 'refund', 'deposit'],
    default: 'booking_payment'
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  refundedAt: Date,
  expiresAt: Date,
  
  // Error handling
  errorMessage: String,
  errorCode: String,
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ paymentMethod: 1, provider: 1 });
paymentSchema.index({ 'providerData.stripePaymentIntentId': 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to generate payment ID
paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    // Generate unique 5-digit number
    let isUnique = false;
    let paymentId;
    
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 90000) + 10000;
      paymentId = `PAY-${dateStr}-${randomNum}`;
      
      // Check if this ID already exists
      const existingPayment = await this.constructor.findOne({ paymentId });
      if (!existingPayment) {
        isUnique = true;
      }
    }
    
    this.paymentId = paymentId;
  }
  
  // Set expiration for pending payments (30 minutes)
  if (this.status === 'pending' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  next();
});

// Instance methods
paymentSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt && this.status === 'pending';
};

paymentSchema.methods.canBeRetried = function() {
  return ['failed', 'cancelled', 'expired'].includes(this.status) && this.retryCount < 3;
};

paymentSchema.methods.isSuccessful = function() {
  return this.status === 'succeeded';
};

paymentSchema.methods.isRefundable = function() {
  return this.status === 'succeeded' && this.breakdown.refundAmount < this.amount;
};

// Static methods
paymentSchema.statics.findByBooking = function(bookingId) {
  return this.find({ booking: bookingId }).sort({ createdAt: -1 });
};

paymentSchema.statics.findPendingPayments = function() {
  return this.find({ 
    status: 'pending',
    expiresAt: { $gte: new Date() }
  });
};

paymentSchema.statics.findFailedPayments = function(userId = null) {
  const query = { status: 'failed' };
  if (userId) query.user = userId;
  return this.find(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema);
