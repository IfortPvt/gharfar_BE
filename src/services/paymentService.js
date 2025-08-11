const Payment = require('../models/Payment');
const PaymentLog = require('../models/PaymentLog');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

// Initialize Stripe with proper error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Warning: STRIPE_SECRET_KEY not found in environment variables. Payment functionality will be limited.');
    console.log('Please add STRIPE_SECRET_KEY to your .env file');
  } else {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error.message);
}

class PaymentService {
  
  // Helper method to check if Stripe is available
  static _checkStripeAvailable() {
    if (!stripe) {
      throw new Error('Stripe not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
  }
  
  // Create payment intent with Stripe
  static async createPaymentIntent(booking, paymentMethod = 'stripe', systemInfo = {}) {
    try {
      this._checkStripeAvailable();
      
      if (!booking) {
        throw new Error('Booking is required');
      }
      
      // Populate booking if needed
      if (!booking.listing) {
        booking = await Booking.findById(booking._id).populate('listing guest');
      }
      
      // Create payment record
      const payment = new Payment({
        booking: booking._id,
        user: booking.guest._id,
        amount: booking.pricing.totalAmount,
        currency: booking.pricing.currency || 'usd',
        paymentMethod: 'stripe_card',
        provider: 'stripe',
        breakdown: {
          baseAmount: booking.pricing.baseAmount || booking.pricing.basePrice || 0,
          cleaningFee: booking.pricing.cleaningFee || 0,
          serviceFee: booking.pricing.serviceFee || 0,
          petFee: booking.pricing.petFee || 0,
          taxes: booking.pricing.taxes || 0,
          extraGuestFee: booking.pricing.extraGuestFee || 0,
          specialPricingAdjustment: booking.pricing.specialPricingAdjustment || 0
        },
        metadata: {
          bookingReadableId: booking.readableId,
          listingTitle: booking.listing?.title || 'Unknown',
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          ...systemInfo
        }
      });
      
      await payment.save();
      
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.pricing.totalAmount * 100), // Convert to cents
        currency: booking.pricing.currency?.toLowerCase() || 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId: booking._id.toString(),
          paymentId: payment.readableId,
          userId: booking.guest._id.toString(),
          listingTitle: booking.listing?.title || 'Unknown'
        },
        description: `Booking payment for ${booking.listing?.title || 'listing'}`,
        receipt_email: booking.guest?.email
      });
      
      // Update payment with Stripe data
      payment.providerData.paymentIntentId = paymentIntent.id;
      payment.providerData.clientSecret = paymentIntent.client_secret;
      payment.status = 'pending';
      await payment.save();
      
      // Log payment initiation
      await this.logPaymentAction({
        payment: payment._id,
        booking: booking._id,
        action: 'payment_intent_created',
        requestData: {
          endpoint: '/v1/payment_intents',
          method: 'POST',
          amount: Math.round(booking.pricing.totalAmount * 100),
          currency: booking.pricing.currency?.toLowerCase() || 'usd'
        },
        responseData: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret
        },
        provider: 'stripe',
        providerRequestId: paymentIntent.id,
        status: 'success',
        systemContext: systemInfo
      });
      
      return {
        paymentId: payment.readableId,
        clientSecret: paymentIntent.client_secret,
        amount: booking.pricing.totalAmount,
        currency: booking.pricing.currency || 'usd',
        status: payment.status
      };
      
    } catch (error) {
      // Log error
      await this.logPaymentAction({
        booking: booking?._id,
        action: 'payment_intent_failed',
        status: 'error',
        errorCode: error.code,
        errorMessage: error.message,
        provider: 'stripe',
        systemContext: systemInfo
      });
      
      throw error;
    }
  }
  
  // Confirm payment success
  static async confirmPayment(paymentIntentId, metadata = {}) {
    try {
      const payment = await Payment.findOne({ 
        'providerData.stripePaymentIntentId': paymentIntentId 
      }).populate('booking');
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        payment.status = 'succeeded';
        payment.completedAt = new Date();
        payment.providerData.stripeChargeId = paymentIntent.latest_charge;
        payment.providerData.providerStatus = paymentIntent.status;
        await payment.save();
        
        // Update booking payment status
        const booking = payment.booking;
        booking.payment.paymentStatus = 'completed';
        booking.payment.paidAt = new Date();
        booking.payment.transactionId = paymentIntent.latest_charge;
        booking.payment.stripePaymentIntentId = paymentIntentId;
        
        // If instant book, confirm booking automatically
        if (booking.bookingType === 'instant') {
          booking.status = 'confirmed';
          booking.confirmedAt = new Date();
          
          // Block availability
          await this.blockAvailability(booking.listing, booking.checkIn, booking.checkOut);
        }
        
        await booking.save();
        
        // Log successful payment
        await this.logPaymentAction({
          payment: payment._id,
          booking: booking._id,
          user: payment.user,
          action: 'payment_succeeded',
          message: `Payment completed successfully for booking ${booking.bookingId}`,
          responseData: {
            statusCode: 200,
            body: {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount_received: paymentIntent.amount_received
            },
            timestamp: new Date()
          },
          providerData: {
            provider: 'stripe',
            transactionId: paymentIntent.id,
            eventId: paymentIntent.latest_charge
          }
        });
        
        return {
          success: true,
          paymentId: payment.paymentId,
          bookingId: booking.bookingId,
          status: booking.status
        };
      } else {
        // Payment not successful
        payment.status = 'failed';
        payment.errorMessage = `Payment intent status: ${paymentIntent.status}`;
        await payment.save();
        
        await this.logPaymentAction({
          payment: payment._id,
          booking: payment.booking._id,
          user: payment.user,
          action: 'payment_failed',
          level: 'error',
          message: `Payment failed for booking ${payment.booking.bookingId}`,
          providerData: {
            provider: 'stripe',
            transactionId: paymentIntent.id,
            errorMessage: `Payment intent status: ${paymentIntent.status}`
          }
        });
        
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  // Process refund
  static async processRefund(paymentId, refundAmount, reason, adminUserId = null) {
    try {
      const payment = await Payment.findOne({ paymentId }).populate('booking');
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (payment.status !== 'succeeded') {
        throw new Error('Payment must be successful to process refund');
      }
      
      const maxRefundable = payment.amount - (payment.breakdown.refundAmount || 0);
      if (refundAmount > maxRefundable) {
        throw new Error(`Refund amount exceeds refundable amount: ${maxRefundable}`);
      }
      
      // Create refund with Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.providerData.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: reason === 'requested_by_customer' ? 'requested_by_customer' : 'duplicate',
        metadata: {
          bookingId: payment.booking._id.toString(),
          paymentId: payment.paymentId,
          adminUserId: adminUserId || 'system'
        }
      });
      
      // Update payment record
      payment.breakdown.refundAmount = (payment.breakdown.refundAmount || 0) + refundAmount;
      
      if (payment.breakdown.refundAmount >= payment.amount) {
        payment.status = 'refunded';
      } else {
        payment.status = 'partially_refunded';
      }
      
      payment.refundedAt = new Date();
      await payment.save();
      
      // Update booking
      const booking = payment.booking;
      booking.payment.refundAmount = (booking.payment.refundAmount || 0) + refundAmount;
      if (booking.payment.refundAmount >= booking.pricing.totalAmount) {
        booking.payment.paymentStatus = 'refunded';
      } else {
        booking.payment.paymentStatus = 'partially_refunded';
      }
      await booking.save();
      
      // Log refund
      await this.logPaymentAction({
        payment: payment._id,
        booking: booking._id,
        user: adminUserId,
        action: 'refund_processed',
        message: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
        responseData: {
          statusCode: 200,
          body: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status
          },
          timestamp: new Date()
        },
        providerData: {
          provider: 'stripe',
          transactionId: refund.id
        }
      });
      
      // Release availability if booking is cancelled
      if (booking.status === 'cancelled') {
        await this.releaseAvailability(booking.listing, booking.checkIn, booking.checkOut);
      }
      
      return {
        success: true,
        refundId: refund.id,
        refundAmount: refundAmount,
        totalRefunded: payment.breakdown.refundAmount
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Get payment status
  static async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate('booking', 'bookingId status')
        .populate('user', 'fullName email');
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      return {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        booking: payment.booking,
        user: payment.user,
        breakdown: payment.breakdown,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        canRetry: payment.canBeRetried()
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Retry failed payment
  static async retryPayment(paymentId, userId) {
    try {
      const payment = await Payment.findOne({ paymentId }).populate('booking');
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (!payment.canBeRetried()) {
        throw new Error('Payment cannot be retried');
      }
      
      if (payment.user.toString() !== userId) {
        throw new Error('Unauthorized to retry this payment');
      }
      
      // Increment retry count
      payment.retryCount += 1;
      payment.status = 'pending';
      payment.errorMessage = null;
      payment.errorCode = null;
      await payment.save();
      
      // Create new payment intent
      return await this.createPaymentIntent(payment.booking._id, userId, {
        isRetry: true,
        originalPaymentId: paymentId
      });
      
    } catch (error) {
      throw error;
    }
  }
  
  // Block availability when booking is confirmed/paid
  static async blockAvailability(listingId, checkIn, checkOut) {
    try {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Find overlapping availability periods and set them to unavailable
      let updated = false;
      
      for (let i = 0; i < listing.availability.length; i++) {
        const period = listing.availability[i];
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        
        // Check if booking dates overlap with this availability period
        if (checkInDate < periodEnd && checkOutDate > periodStart) {
          // Split the availability period around the booking
          const updatedPeriods = [];
          
          // Add period before booking if exists
          if (periodStart < checkInDate) {
            updatedPeriods.push({
              start: periodStart,
              end: checkInDate,
              isAvailable: period.isAvailable,
              specialPricing: period.specialPricing
            });
          }
          
          // Add unavailable period for booking dates
          updatedPeriods.push({
            start: checkInDate,
            end: checkOutDate,
            isAvailable: false,
            specialPricing: period.specialPricing
          });
          
          // Add period after booking if exists
          if (periodEnd > checkOutDate) {
            updatedPeriods.push({
              start: checkOutDate,
              end: periodEnd,
              isAvailable: period.isAvailable,
              specialPricing: period.specialPricing
            });
          }
          
          // Replace the original period with updated periods
          listing.availability.splice(i, 1, ...updatedPeriods);
          updated = true;
          break;
        }
      }
      
      if (updated) {
        await listing.save();
      }
      
      return { success: true, updated };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Release availability when booking is cancelled
  static async releaseAvailability(listingId, checkIn, checkOut) {
    try {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Find the blocked period and make it available again
      for (let i = 0; i < listing.availability.length; i++) {
        const period = listing.availability[i];
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        
        // Check if this is the blocked period
        if (periodStart.getTime() === checkInDate.getTime() && 
            periodEnd.getTime() === checkOutDate.getTime() && 
            !period.isAvailable) {
          
          period.isAvailable = true;
          await listing.save();
          break;
        }
      }
      
      return { success: true };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Log payment actions
  static async logPaymentAction(logData) {
    try {
      const log = new PaymentLog({
        payment: logData.payment,
        booking: logData.booking,
        user: logData.user,
        action: logData.action,
        message: logData.message,
        level: logData.level || 'info',
        requestData: logData.requestData,
        responseData: logData.responseData,
        providerData: logData.providerData || { provider: 'stripe' }
      });
      
      await log.save();
      return log;
      
    } catch (error) {
      console.error('Failed to create payment log:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
  
  // Handle Stripe webhooks
  static async handleStripeWebhook(event, signature) {
    try {
      // Verify webhook signature
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let stripeEvent;
      
      try {
        stripeEvent = stripe.webhooks.constructEvent(event, signature, endpointSecret);
      } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
      
      // Log webhook received
      await this.logPaymentAction({
        action: 'webhook_received',
        message: `Received Stripe webhook: ${stripeEvent.type}`,
        providerData: {
          provider: 'stripe',
          eventId: stripeEvent.id,
          webhookId: stripeEvent.id
        },
        responseData: {
          body: stripeEvent.data,
          timestamp: new Date()
        }
      });
      
      // Handle different webhook types
      switch (stripeEvent.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(stripeEvent.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(stripeEvent.data.object);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(stripeEvent.data.object);
          break;
        default:
          console.log(`Unhandled webhook type: ${stripeEvent.type}`);
      }
      
      return { received: true };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Handle successful payment webhook
  static async handlePaymentSucceeded(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        'providerData.stripePaymentIntentId': paymentIntent.id
      }).populate('booking');
      
      if (payment && payment.status !== 'succeeded') {
        await this.confirmPayment(paymentIntent.id);
      }
      
    } catch (error) {
      console.error('Error handling payment succeeded webhook:', error);
    }
  }
  
  // Handle failed payment webhook
  static async handlePaymentFailed(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        'providerData.stripePaymentIntentId': paymentIntent.id
      });
      
      if (payment) {
        payment.status = 'failed';
        payment.errorMessage = paymentIntent.last_payment_error?.message;
        payment.errorCode = paymentIntent.last_payment_error?.code;
        await payment.save();
        
        await this.logPaymentAction({
          payment: payment._id,
          booking: payment.booking,
          user: payment.user,
          action: 'payment_failed',
          level: 'error',
          message: 'Payment failed via webhook',
          providerData: {
            provider: 'stripe',
            transactionId: paymentIntent.id,
            errorMessage: payment.errorMessage,
            errorCode: payment.errorCode
          }
        });
      }
      
    } catch (error) {
      console.error('Error handling payment failed webhook:', error);
    }
  }
  
  // Handle dispute created webhook
  static async handleDisputeCreated(charge) {
    try {
      const payment = await Payment.findOne({
        'providerData.stripeChargeId': charge.id
      });
      
      if (payment) {
        payment.status = 'disputed';
        await payment.save();
        
        await this.logPaymentAction({
          payment: payment._id,
          booking: payment.booking,
          user: payment.user,
          action: 'dispute_created',
          level: 'warning',
          message: 'Payment disputed by customer',
          providerData: {
            provider: 'stripe',
            transactionId: charge.id
          }
        });
      }
      
    } catch (error) {
      console.error('Error handling dispute created webhook:', error);
    }
  }
}

module.exports = PaymentService;
