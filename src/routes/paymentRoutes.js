const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { pagination } = require('../middleware/pagination');
const { sorting } = require('../middleware/sorting');

// Apply authentication to all routes
router.use(auth);

// Create payment intent for booking
router.post(
  '/bookings/:bookingId/payment-intent',
  PaymentController.createPaymentIntentValidation,
  PaymentController.createPaymentIntent
);

// Confirm payment
router.post(
  '/:paymentId/confirm',
  PaymentController.confirmPaymentValidation,
  PaymentController.confirmPayment
);

// Get payment status
router.get(
  '/:paymentId/status',
  PaymentController.getPaymentStatus
);

// Retry failed payment
router.post(
  '/:paymentId/retry',
  PaymentController.retryPayment
);

// Process refund (admin/host only)
router.post(
  '/:paymentId/refund',
  authorizeRoles('admin', 'host'),
  PaymentController.processRefundValidation,
  PaymentController.processRefund
);

// Get payment history for a booking
router.get(
  '/bookings/:bookingId/payments',
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'amount', 'status'] }),
  PaymentController.getBookingPayments
);

// Get user payment history
router.get(
  '/users/:userId/payments',
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'amount', 'status'] }),
  PaymentController.getUserPayments
);

// Get current user's payment history
router.get(
  '/my-payments',
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'amount', 'status'] }),
  PaymentController.getUserPayments
);

// Admin routes
router.get(
  '/admin/all',
  authorizeRoles('admin'),
  pagination({ defaultLimit: 50 }),
  sorting({ allowedFields: ['createdAt', 'amount', 'status', 'paymentMethod'] }),
  PaymentController.getAllPayments
);

// Stripe webhook (no auth required, but signature verified)
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }), // Raw body for webhook signature verification
  PaymentController.handleStripeWebhook
);

module.exports = router;
