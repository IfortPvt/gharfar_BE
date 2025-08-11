// Admin routes for comprehensive management
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const pricingConfigController = require('../controllers/pricingConfigController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validator');
const { pagination } = require('../middleware/pagination');
const { sorting } = require('../middleware/sorting');
const { 
  validateListing,
  validateSearchParams,
  validateAvailabilityPeriod,
  // Add update validator
  validateListingUpdate
} = require('../validators/listingValidator');
const { validatePricingConfig } = require('../validators/pricingConfigValidator');

// ================================
// USER MANAGEMENT ROUTES
// ================================

// Only admin can create users
router.post('/users', auth, authorizeRoles('admin','superadmin'), adminController.createUser);

// Only superadmin can create admin users
router.post('/admins', auth, authorizeRoles('admin','superadmin'), adminController.createAdmin);

// CRUD endpoints for admin user management
router.get('/users', 
  auth, 
  authorizeRoles('admin','superadmin'), 
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['fullName', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'] }),
  adminController.getAllUsers
);
router.get('/users/:id', auth, authorizeRoles('admin','superadmin'), adminController.getUserById);
router.put('/users/:id', auth, authorizeRoles('admin','superadmin'), adminController.updateUser);
router.delete('/users/:id', auth, authorizeRoles('admin','superadmin'), adminController.deleteUser);

// ================================
// LISTING MANAGEMENT ROUTES
// ================================

// Get all listings with advanced filtering and pagination
router.get('/listings', auth, authorizeRoles('admin','superadmin'), adminController.getAllListings);

// Get listing statistics and counters
router.get('/listings/stats', auth, authorizeRoles('admin','superadmin'), adminController.getListingStats);

// Get listing by ID (admin view with all details)
router.get('/listings/:id', auth, authorizeRoles('admin','superadmin'), adminController.getListingById);

// Create listing for specific host
router.post('/listings/host/:hostId', [
  auth,
  authorizeRoles('admin','superadmin'),
  upload.array('images', 10),
  handleUploadError,
  validateListing,
  validateRequest
], adminController.createListingForHost);

// Update listing (admin can edit any listing)
router.put('/listings/:id', [
  auth,
  authorizeRoles('admin','superadmin'),
  validateListingUpdate,
  validateRequest
], adminController.updateListing);

// Update listing status (pending, approved, rejected, suspended)
router.put('/listings/:id/status', auth, authorizeRoles('admin','superadmin'), adminController.updateListingStatus);

// Bulk status update for multiple listings
router.put('/listings/bulk/status', auth, authorizeRoles('admin','superadmin'), adminController.bulkUpdateListingStatus);

// Delete listing (soft delete)
router.delete('/listings/:id', auth, authorizeRoles('admin','superadmin'), adminController.deleteListing);

// Get listings by host
router.get('/listings/host/:hostId', 
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination(20, 100),
  adminController.getListingsByHost
);

// Get listing activity logs
router.get('/listings/:id/activity', 
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination(20, 100),
  adminController.getListingActivity
);

// ================================
// BOOKING MANAGEMENT ROUTES
// ================================

// Get all bookings with advanced filtering
router.get('/bookings', auth, authorizeRoles('admin','superadmin'), adminController.getAllBookings);

// Get booking statistics and counters
router.get('/bookings/stats', auth, authorizeRoles('admin','superadmin'), adminController.getBookingStats);

// Get today's bookings summary
router.get('/bookings/today-summary', auth, authorizeRoles('admin','superadmin'), adminController.getTodayBookingSummary);

// Get booking by ID (admin view)
router.get('/bookings/:id', auth, authorizeRoles('admin','superadmin'), adminController.getBookingById);

// Create booking for specific guest
router.post('/bookings/guest/:guestId', auth, authorizeRoles('admin','superadmin'), adminController.createBookingForGuest);

// Update booking status
router.put('/bookings/:id/status', auth, authorizeRoles('admin','superadmin'), adminController.updateBookingStatus);

// Cancel booking with refund options
router.put('/bookings/:id/cancel', auth, authorizeRoles('admin','superadmin'), adminController.cancelBooking);

// Force complete booking
router.put('/bookings/:id/complete', auth, authorizeRoles('admin','superadmin'), adminController.completeBooking);

// Get bookings by guest
router.get('/bookings/guest/:guestId', auth, authorizeRoles('admin','superadmin'), adminController.getBookingsByGuest);

// Get bookings by host
router.get('/bookings/host/:hostId', auth, authorizeRoles('admin','superadmin'), adminController.getBookingsByHost);

// Get booking activity logs
router.get('/bookings/:id/activity', auth, authorizeRoles('admin','superadmin'), adminController.getBookingActivity);

// Bulk booking operations
router.put('/bookings/bulk/status', auth, authorizeRoles('admin','superadmin'), adminController.bulkUpdateBookingStatus);

// ================================
// PAYMENT MANAGEMENT ROUTES
// ================================

// Get all payments with filtering
router.get('/payments', auth, authorizeRoles('admin','superadmin'), adminController.getAllPayments);

// Get payment statistics
router.get('/payments/stats', auth, authorizeRoles('admin','superadmin'), adminController.getPaymentStats);

// Get payment by ID
router.get('/payments/:id', auth, authorizeRoles('admin','superadmin'), adminController.getPaymentById);

// Generate invoice data
router.get('/payments/:id/invoice', auth, authorizeRoles('admin','superadmin'), adminController.generateInvoiceData);

// Get payment reports
router.get('/payments/reports', auth, authorizeRoles('admin','superadmin'), adminController.getPaymentReports);

// Process manual refund
router.post('/payments/:id/refund', auth, authorizeRoles('admin','superadmin'), adminController.processManualRefund);

// Update payment status
router.put('/payments/:id/status', auth, authorizeRoles('admin','superadmin'), adminController.updatePaymentStatus);

// ================================
// DASHBOARD & ANALYTICS ROUTES
// ================================

// Get dashboard overview data
router.get('/dashboard/overview', auth, authorizeRoles('admin','superadmin'), adminController.getDashboardOverview);

// Get daily counters (today's stats)
router.get('/dashboard/counters', auth, authorizeRoles('admin','superadmin'), adminController.getDailyCounters);

// Get revenue analytics
router.get('/dashboard/revenue', auth, authorizeRoles('admin','superadmin'), adminController.getRevenueAnalytics);

// Get user growth analytics  
router.get('/dashboard/user-growth', auth, authorizeRoles('admin','superadmin'), adminController.getUserGrowthAnalytics);

// Get booking trends
router.get('/dashboard/booking-trends', auth, authorizeRoles('admin','superadmin'), adminController.getBookingTrends);

// Get top performing listings
router.get('/dashboard/top-listings', auth, authorizeRoles('admin','superadmin'), adminController.getTopPerformingListings);

// ================================
// IMAGE MANAGEMENT ROUTES
// ================================

// Admin upload images to any listing
router.post('/listings/:id/images', [
  auth,
  authorizeRoles('admin','superadmin'),
  upload.array('images', 10),
  handleUploadError,
  validateRequest
], adminController.adminUploadListingImages);

// Get all listing images with admin details (includes metadata, status, etc.)
router.get('/listings/:id/images', [
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination({ defaultLimit: 10 }),
  validateRequest
], adminController.getListingImages);

// Admin update single image
router.put('/listings/:id/images/:imageId', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.updateListingImage);

// Get image statistics for admin dashboard
router.get('/images/statistics', [
  auth, 
  authorizeRoles('admin','superadmin')
], adminController.getImageStatistics);

// Get images pending review
router.get('/images/pending-review', [
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination({ defaultLimit: 10 }),
  validateRequest
], adminController.getImagesPendingReview);

// Get flagged images report
router.get('/images/flagged', [
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination({ defaultLimit: 10 }),
  validateRequest
], adminController.getFlaggedImages);

// Get image analytics (detailed analytics over time)
router.get('/listings/images/analytics', [
  auth, 
  authorizeRoles('admin','superadmin')
], adminController.getImageAnalytics);

// Admin bulk image operations (approve, reject, flag, delete)
router.put('/listings/:id/images/bulk-operation', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.bulkImageOperations);

// Admin force set featured image
router.put('/listings/:id/images/:imageId/featured', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.forceSetFeaturedImage);

// Admin approve/reject/flag image status
router.put('/listings/:id/images/:imageId/status', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.updateImageStatus);

// Generate thumbnails for images
router.post('/images/generate-thumbnails', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.generateImageThumbnails);

// Optimize images (compress, resize, format conversion)
router.post('/listings/:id/images/optimize', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.optimizeImages);

// Validate image quality
router.post('/images/:imageId/validate', [
  auth, 
  authorizeRoles('admin','superadmin'),
  validateRequest
], adminController.validateImageQuality);

// Search and filter images across platform
router.get('/images/filter', [
  auth, 
  authorizeRoles('admin','superadmin'),
  pagination({ defaultLimit: 10 }),
  validateRequest
], adminController.filterImages);

// Get critical issues/alerts
router.get('/dashboard/alerts', auth, authorizeRoles('admin','superadmin'), adminController.getCriticalAlerts);

// Get dashboard metrics with period filter
router.get('/dashboard/metrics', auth, authorizeRoles('admin','superadmin'), adminController.getDashboardMetrics);

// Get recent activities/logs
router.get('/dashboard/activities', auth, authorizeRoles('admin','superadmin'), adminController.getDashboardActivities);

// ================================
// REPORTS ROUTES
// ================================

// Generate comprehensive overview report
router.get('/reports/overview', auth, authorizeRoles('admin','superadmin'), adminController.generateOverviewReport);

// Generate comprehensive reports
router.get('/reports/bookings', auth, authorizeRoles('admin','superadmin'), adminController.generateBookingReport);
router.get('/reports/revenue', auth, authorizeRoles('admin','superadmin'), adminController.generateRevenueReport);
router.get('/reports/listings', auth, authorizeRoles('admin','superadmin'), adminController.generateListingReport);
router.get('/reports/users', auth, authorizeRoles('admin','superadmin'), adminController.generateUserReport);

// Export reports (CSV/PDF)
router.get('/reports/export/bookings', auth, authorizeRoles('admin','superadmin'), adminController.exportBookingReport);
router.get('/reports/export/revenue', auth, authorizeRoles('admin','superadmin'), adminController.exportRevenueReport);

// Delete single listing image (admin)
router.delete('/listings/:id/images/:imageId', [
  auth,
  authorizeRoles('admin', 'superadmin')
], adminController.deleteListingImage);

// Bulk delete listing images (admin)
router.delete('/listings/:id/images/bulk-delete', [
  auth,
  authorizeRoles('admin', 'superadmin')
], adminController.bulkDeleteListingImages);

// ================================
// PRICING CONFIG MANAGEMENT ROUTES
// ================================

// Global pricing config
router.get('/pricing-config/global', auth, authorizeRoles('admin','superadmin'), pricingConfigController.getGlobal);
router.put('/pricing-config/global', [
  auth,
  authorizeRoles('admin','superadmin'),
  validatePricingConfig,
  validateRequest
], pricingConfigController.upsertGlobal);

// Host-level pricing config
router.get('/pricing-config/host/:hostId', auth, authorizeRoles('admin','superadmin'), pricingConfigController.getHost);
router.put('/pricing-config/host/:hostId', [
  auth,
  authorizeRoles('admin','superadmin'),
  validatePricingConfig,
  validateRequest
], pricingConfigController.upsertHost);

// Listing-level pricing config
router.get('/pricing-config/listing/:listingId', auth, authorizeRoles('admin','superadmin'), pricingConfigController.getListing);
router.put('/pricing-config/listing/:listingId', [
  auth,
  authorizeRoles('admin','superadmin'),
  validatePricingConfig,
  validateRequest
], pricingConfigController.upsertListing);

// Listing/Host effective pricing config (merged overrides)
router.get('/pricing-config/effective/listing/:listingId', auth, authorizeRoles('admin','superadmin'), pricingConfigController.getEffectiveForListing);
router.get('/pricing-config/effective/host/:hostId', auth, authorizeRoles('admin','superadmin'), pricingConfigController.getEffectiveForHost);

module.exports = router;
