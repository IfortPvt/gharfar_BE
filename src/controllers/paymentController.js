const PaymentService = require('../services/paymentService');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

class PaymentController {
  
  // Create payment intent
  static async createPaymentIntent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }
      
      const { bookingId } = req.params;
      const { paymentMethod = 'stripe' } = req.body;
      
      // Check if booking exists and belongs to user
      const booking = await Booking.findById(bookingId).populate('listing');
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      // Verify booking belongs to user (unless admin)
      if (req.user.role !== 'admin' && booking.guest.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to booking'
        });
      }
      
      // Check if booking is in valid state for payment
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot process payment for booking with status: ${booking.status}`
        });
      }
      
      // Check if payment already completed
      if (booking.payment.paymentStatus === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Payment already completed for this booking'
        });
      }
      
      const result = await PaymentService.createPaymentIntent(booking, paymentMethod, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });
      
      res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment intent'
      });
    }
  }
  
  // Confirm payment
  static async confirmPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }
      
      const { paymentId } = req.params;
      const { paymentIntentId, paymentMethodId } = req.body;
      
      // Find payment
      const payment = await Payment.findById(paymentId).populate('booking');
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      // Verify payment belongs to user (unless admin)
      if (req.user.role !== 'admin' && payment.booking.guest.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to payment'
        });
      }
      
      // Check if payment is in valid state
      if (payment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot confirm payment with status: ${payment.status}`
        });
      }
      
      const result = await PaymentService.confirmPayment(
        payment._id,
        paymentIntentId,
        paymentMethodId,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to confirm payment'
      });
    }
  }
  
  // Get payment status
  static async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      
      const payment = await Payment.findById(paymentId)
        .populate('booking', 'readableId status')
        .populate('user', 'fullName email');
        
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      // Verify payment belongs to user (unless admin)
      if (req.user.role !== 'admin' && payment.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to payment'
        });
      }
      
      res.status(200).json({
        success: true,
        data: payment
      });
      
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status'
      });
    }
  }
  
  // Retry payment
  static async retryPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;
      
      const payment = await Payment.findById(paymentId).populate('booking');
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      // Verify payment belongs to user (unless admin)
      if (req.user.role !== 'admin' && payment.booking.guest.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to payment'
        });
      }
      
      // Check if payment can be retried
      if (!['failed', 'expired', 'cancelled'].includes(payment.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot retry payment with status: ${payment.status}`
        });
      }
      
      const result = await PaymentService.retryPayment(paymentId, paymentMethodId, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });
      
      res.status(200).json({
        success: true,
        message: 'Payment retry initiated successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retry payment'
      });
    }
  }
  
  // Process refund (admin/host only)
  static async processRefund(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }
      
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      
      // Check permissions
      if (!['admin', 'host'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to process refund'
        });
      }
      
      const payment = await Payment.findById(paymentId).populate('booking');
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      // If host, verify they own the listing
      if (req.user.role === 'host') {
        const booking = await Booking.findById(payment.booking._id).populate('listing');
        if (booking.listing.host.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Can only refund payments for your own listings'
          });
        }
      }
      
      const result = await PaymentService.processRefund(
        paymentId,
        amount,
        reason,
        req.user._id,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process refund'
      });
    }
  }
  
  // Get payment history for booking
  static async getBookingPayments(req, res) {
    try {
      const { bookingId } = req.params;
      
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      // Verify access
      const hasAccess = req.user.role === 'admin' || 
                       booking.guest.toString() === req.user._id.toString() ||
                       (req.user.role === 'host' && booking.listing?.host?.toString() === req.user._id.toString());
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to booking payments'
        });
      }
      
      const payments = await Payment.find({ booking: bookingId })
        .sort({ createdAt: -1 })
        .populate('user', 'fullName email');
      
      res.status(200).json({
        success: true,
        data: payments
      });
      
    } catch (error) {
      console.error('Get booking payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get booking payments'
      });
    }
  }
  
  // Get user payment history
  static async getUserPayments(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const userId = req.params.userId || req.user._id;
      
      // Verify access
      if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to user payments'
        });
      }
      
      const query = { user: userId };
      if (status) {
        query.status = status;
      }
      
      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('booking', 'readableId checkIn checkOut status')
        .populate('user', 'fullName email');
      
      const total = await Payment.countDocuments(query);
      
      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get user payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user payments'
      });
    }
  }
  
  // Handle Stripe webhook
  static async handleStripeWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!sig || !endpointSecret) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhook signature or secret'
        });
      }
      
      await PaymentService.handleStripeWebhook(req.body, sig, endpointSecret);
      
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
      
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }
  
  // Admin: Get all payments with filters
  static async getAllPayments(req, res) {
    try {
      // Admin only
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const { 
        page = 1, 
        limit = 20, 
        status, 
        provider, 
        startDate, 
        endDate,
        minAmount,
        maxAmount 
      } = req.query;
      
      const query = {};
      
      if (status) query.status = status;
      if (provider) query.provider = provider;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }
      
      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('booking', 'readableId status')
        .populate('user', 'fullName email');
      
      const total = await Payment.countDocuments(query);
      
      // Calculate summary statistics
      const stats = await Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            totalRefunded: { $sum: '$refundedAmount' },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          },
          summary: stats[0] || {
            totalAmount: 0,
            averageAmount: 0,
            totalRefunded: 0,
            completedPayments: 0,
            failedPayments: 0
          }
        }
      });
      
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payments'
      });
    }
  }
}

// Validation rules
PaymentController.createPaymentIntentValidation = [
  body('paymentMethod').optional().isIn(['stripe']).withMessage('Invalid payment method')
];

PaymentController.confirmPaymentValidation = [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('paymentMethodId').optional().isMongoId().withMessage('Invalid payment method ID')
];

PaymentController.processRefundValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').notEmpty().withMessage('Refund reason is required').isLength({ max: 500 }).withMessage('Reason too long')
];

module.exports = PaymentController;
