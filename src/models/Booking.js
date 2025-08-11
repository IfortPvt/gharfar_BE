const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Human-readable booking ID
  bookingId: {
    type: String,
    unique: true,
    index: true
  },
  
  // Basic booking information
  listing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Listing', 
    required: true 
  },
  guest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Booking dates and duration
  checkIn: { 
    type: Date, 
    required: true 
  },
  checkOut: { 
    type: Date, 
    required: true 
  },
  nights: { 
    type: Number, 
    required: true 
  },

  // Guest details
  adults: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  children: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  infants: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  totalGuests: { 
    type: Number, 
    required: true 
  },

  // Pet information
  petDetails: {
    hasPets: { 
      type: Boolean, 
      default: false 
    },
    numberOfPets: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    petTypes: [{
      type: String,
      enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other']
    }],
    petInfo: [{
      name: String,
      type: {
        type: String,
        enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other']
      },
      breed: String,
      weight: Number,
      age: Number,
      isServiceAnimal: { type: Boolean, default: false },
      vaccinated: { type: Boolean, default: false },
      notes: String
    }]
  },

  // Pricing breakdown
  pricing: {
    basePrice: { 
      type: Number, 
      required: true 
    },
    pricePerNight: { 
      type: Number, 
      required: true 
    },
    subtotal: { 
      type: Number, 
      required: true 
    },
    
    // Fees
    cleaningFee: { 
      type: Number, 
      default: 0 
    },
    serviceFee: { 
      type: Number, 
      default: 0 
    },
    petFee: { 
      type: Number, 
      default: 0 
    },
    petDeposit: { 
      type: Number, 
      default: 0 
    },
    
    // Taxes
    taxes: { 
      type: Number, 
      default: 0 
    },
    
    // Total
    totalAmount: { 
      type: Number, 
      required: true 
    },
    currency: { 
      type: String, 
      default: 'USD' 
    }
  },

  // Booking status and flow
  status: { 
    type: String, 
    enum: [
      'pending',           // Waiting for host approval
      'confirmed',         // Confirmed by host
      'checked-in',        // Guest has checked in
      'checked-out',       // Guest has checked out
      'completed',         // Booking completed
      'cancelled',         // Cancelled by guest/host
      'declined',          // Declined by host
      'expired'            // Booking request expired
    ], 
    default: 'pending' 
  },

  // Booking type
  bookingType: {
    type: String,
    enum: ['instant', 'request'], // Instant book vs approval required
    required: true
  },

  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
      required: true
    },
    transactionId: String,
    stripePaymentIntentId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: { type: Number, default: 0 }
  },

  // Special requests and communication
  guestMessage: { 
    type: String, 
    maxlength: 1000 
  },
  hostResponse: { 
    type: String, 
    maxlength: 1000 
  },
  specialRequests: [{
    type: String,
    enum: [
      'early_checkin',
      'late_checkout',
      'accessibility_assistance',
      'pet_accommodation',
      'child_safety',
      'dietary_requirements',
      'transportation',
      'other'
    ]
  }],

  // Cancellation details
  cancellation: {
    cancelledBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: { type: Number, default: 0 },
    cancellationPolicy: String
  },

  // Check-in/out details
  checkInDetails: {
    actualCheckIn: Date,
    checkInMethod: {
      type: String,
      enum: ['self', 'host_greeting', 'keybox', 'doorman', 'mobile_key']
    },
    checkInInstructions: String,
    accessCodes: String // Should be encrypted in production
  },

  checkOutDetails: {
    actualCheckOut: Date,
    checkOutInstructions: String,
    propertyCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    damages: [{
      description: String,
      estimatedCost: Number,
      images: [String]
    }]
  },

  // Reviews and ratings (references)
  guestReview: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Review' 
  },
  hostReview: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Review' 
  },

  // Metadata
  bookingNumber: { 
    type: String, 
    unique: true 
  },
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'api'],
    default: 'web'
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  },

  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  confirmedAt: Date,
  expiresAt: Date // For pending bookings
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for performance
bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });
// bookingNumber already has unique: true which creates an index
// bookingId already has index: true in schema definition
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ 'petDetails.hasPets': 1 });
bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to generate human-readable bookingId
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    // Generate unique 5-digit number
    let isUnique = false;
    let bookingId;
    
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
      bookingId = `BKG-${dateStr}-${randomNum}`;
      
      // Check if this ID already exists
      const existingBooking = await this.constructor.findOne({ bookingId });
      if (!existingBooking) {
        isUnique = true;
      }
    }
    
    this.bookingId = bookingId;
  }
  next();
});

bookingSchema.pre('save', function(next) {
  // Generate booking number if not exists
  if (!this.bookingNumber) {
    this.bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  // Calculate nights
  if (this.checkIn && this.checkOut) {
    const diffTime = Math.abs(this.checkOut - this.checkIn);
    this.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate total guests
  this.totalGuests = this.adults + this.children;

  // Set expiration for pending bookings (24 hours)
  if (this.status === 'pending' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // Update updatedAt
  this.updatedAt = new Date();

  next();
});

// Virtual for booking duration in a readable format
bookingSchema.virtual('duration').get(function() {
  if (this.nights === 1) return '1 night';
  return `${this.nights} nights`;
});

// Virtual for total guests description
bookingSchema.virtual('guestDescription').get(function() {
  let desc = `${this.adults} adult${this.adults > 1 ? 's' : ''}`;
  if (this.children > 0) {
    desc += `, ${this.children} child${this.children > 1 ? 'ren' : ''}`;
  }
  if (this.infants > 0) {
    desc += `, ${this.infants} infant${this.infants > 1 ? 's' : ''}`;
  }
  return desc;
});

// Instance methods
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
  
  return ['pending', 'confirmed'].includes(this.status) && hoursUntilCheckIn > 24;
};

bookingSchema.methods.calculateRefund = function(cancellationPolicy = 'moderate') {
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
  
  let refundPercentage = 0;
  
  switch (cancellationPolicy) {
    case 'flexible':
      refundPercentage = daysUntilCheckIn >= 1 ? 100 : 0;
      break;
    case 'moderate':
      refundPercentage = daysUntilCheckIn >= 5 ? 100 : (daysUntilCheckIn >= 1 ? 50 : 0);
      break;
    case 'strict':
      refundPercentage = daysUntilCheckIn >= 7 ? 100 : (daysUntilCheckIn >= 1 ? 50 : 0);
      break;
    default:
      refundPercentage = 0;
  }
  
  const refundAmount = (this.pricing.totalAmount * refundPercentage) / 100;
  // Always refund pet deposit if applicable
  const totalRefund = refundAmount + (this.pricing.petDeposit || 0);
  
  return {
    refundPercentage,
    refundAmount: totalRefund,
    nonRefundableAmount: this.pricing.totalAmount - refundAmount
  };
};

bookingSchema.methods.isExpired = function() {
  return this.status === 'pending' && this.expiresAt && new Date() > this.expiresAt;
};

bookingSchema.methods.requiresHostApproval = function() {
  return this.bookingType === 'request';
};

// Static methods
bookingSchema.statics.findActiveBookings = function(filters = {}) {
  return this.find({
    status: { $in: ['confirmed', 'checked-in'] },
    ...filters
  });
};

bookingSchema.statics.findUpcomingBookings = function(userId, userType = 'guest') {
  const userField = userType === 'guest' ? 'guest' : 'host';
  return this.find({
    [userField]: userId,
    status: { $in: ['confirmed', 'pending'] },
    checkIn: { $gte: new Date() }
  }).sort({ checkIn: 1 });
};

bookingSchema.statics.findPastBookings = function(userId, userType = 'guest') {
  const userField = userType === 'guest' ? 'guest' : 'host';
  return this.find({
    [userField]: userId,
    status: { $in: ['completed', 'checked-out'] },
    checkOut: { $lt: new Date() }
  }).sort({ checkOut: -1 });
};

bookingSchema.statics.findByDateRange = function(listingId, startDate, endDate) {
  return this.find({
    listing: listingId,
    status: { $in: ['confirmed', 'checked-in', 'pending'] },
    $or: [
      { checkIn: { $gte: startDate, $lt: endDate } },
      { checkOut: { $gt: startDate, $lte: endDate } },
      { checkIn: { $lte: startDate }, checkOut: { $gte: endDate } }
    ]
  });
};

bookingSchema.statics.findWithPets = function(filters = {}) {
  return this.find({
    'petDetails.hasPets': true,
    ...filters
  });
};

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
