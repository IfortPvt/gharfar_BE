// Admin controller for comprehensive management
const adminService = require('../services/adminService');
const UserService = require('../services/userService');
const listingService = require('../services/listingService');
const bookingService = require('../services/bookingService');
const paymentService = require('../services/paymentService');
const { createUserSchema } = require('../validators/adminValidator');

// ================================
// USER MANAGEMENT CONTROLLERS
// ================================

exports.createUser = async (req, res, next) => {
  try {
    const value = await createUserSchema.validateAsync(req.body);
    const user = await UserService.createUser(value, req.user._id);
    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      user 
    });
  } catch (err) {
    next(err);
  }
};

// Endpoint for superadmin to create a new admin user
exports.createAdmin = async (req, res, next) => {
  try {
    // Only allow creation of users with role 'admin'
    const value = await createUserSchema.validateAsync({ ...req.body, role: 'admin' });
    const user = await UserService.createUser(value, req.user._id);
    res.status(201).json({ 
      success: true,
      message: 'Admin user created successfully',
      user 
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log('Fetching all users with filters:', req.query);
    
    const result = await UserService.getAllUsers(req);
    res.status(200).json({ 
      success: true,
      ...result 
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await UserService.getProfile(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true,
      user 
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { updateUserSchema } = require('../validators/adminUpdateValidator');
    const value = await updateUserSchema.validateAsync(req.body);
    const user = await UserService.updateUser(req.params.id, value, req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true,
      message: 'User updated successfully',
      user 
    });
  } catch (err) {
    next(err);
  }
};

exports.suspendUser = async (req, res, next) => {
  try {
    const { reason, duration } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }
    
    const user = await UserService.suspendUser(
      req.params.id, 
      { reason, duration: parseInt(duration) }, 
      req.user._id
    );
    
    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.reactivateUser = async (req, res, next) => {
  try {
    const user = await UserService.reactivateUser(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'User reactivated successfully',
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { deleteReason } = req.body;
    
    // For now, we'll use the existing admin service method
    // but could enhance it to use the new UserService methods
    const user = await adminService.deleteUser(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};

// New user management endpoints
exports.getUserStatistics = async (req, res, next) => {
  try {
    const stats = await UserService.getUserStatistics();
    res.status(200).json({
      success: true,
      statistics: stats
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserActivity = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const activity = await UserService.getUserActivity(req.params.id, { page, limit });
    res.status(200).json({
      success: true,
      activity
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyUserEmail = async (req, res, next) => {
  try {
    const user = await UserService.verifyEmail(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User email verified successfully',
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.addUserNote = async (req, res, next) => {
  try {
    const { note, priority = 'medium' } = req.body;
    
    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }
    
    const updateData = {
      $push: {
        adminNotes: {
          note,
          addedBy: req.user._id,
          priority
        }
      }
    };
    
    const user = await UserService.updateUser(req.params.id, updateData, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.flagUser = async (req, res, next) => {
  try {
    const { type, description, severity = 'medium' } = req.body;
    
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Flag type and description are required'
      });
    }
    
    const updateData = {
      $push: {
        flags: {
          type,
          description,
          severity,
          flaggedBy: req.user._id
        }
      }
    };
    
    const user = await UserService.updateUser(req.params.id, updateData, req.user._id);
    res.status(200).json({
      success: true,
      message: 'User flagged successfully',
      user
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// LISTING MANAGEMENT CONTROLLERS
// ================================

exports.getAllListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      listingType,
      hostId,
      city,
      state,
      country,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const listings = await adminService.getAllListingsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      listingType,
      hostId,
      city,
      state,
      country,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
      search
    });

    res.json({
      success: true,
      data: listings.listings,
      pagination: {
        currentPage: listings.currentPage,
        totalPages: listings.totalPages,
        totalItems: listings.totalItems,
        hasNext: listings.hasNext,
        hasPrev: listings.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getListingStats = async (req, res, next) => {
  try {
    const stats = await adminService.getListingStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    const listing = await adminService.getListingByIdAdmin(req.params.id);
    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Listing not found' 
      });
    }
    res.json({
      success: true,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

exports.createListingForHost = async (req, res, next) => {
  try {
    const hostId = req.params.hostId;
    const listing = await adminService.createListingForHost(req.body, hostId, req.files);
    res.status(201).json({
      success: true,
      data: listing,
      message: 'Listing created successfully for host'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const listing = await adminService.updateListingAdmin(req.params.id, req.body);
    res.json({
      success: true,
      data: listing,
      message: 'Listing updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status, reason, notifyHost = true } = req.body;
    const listing = await adminService.updateListingStatus(req.params.id, status, reason, req.user._id, notifyHost);
    res.json({
      success: true,
      data: listing,
      message: `Listing status updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateListingStatus = async (req, res, next) => {
  try {
    const { listingIds, status, reason } = req.body;
    const result = await adminService.bulkUpdateListingStatus(listingIds, status, reason, req.user._id);
    res.json({
      success: true,
      data: result,
      message: `${result.updatedCount} listings updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await adminService.deleteListingAdmin(req.params.id, reason, req.user._id);
    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getListingsByHost = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await adminService.getListingsByHost(req.params.hostId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    // result is already standardized by createPaginationResponse
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getListingActivity = async (req, res, next) => {
  try {
    const result = await adminService.getListingActivity(req.params.id, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ================================
// BOOKING MANAGEMENT CONTROLLERS
// ================================

exports.getAllBookings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      hostId,
      guestId,
      listingId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const bookings = await adminService.getAllBookingsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      paymentStatus,
      hostId,
      guestId,
      listingId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      search
    });

    res.json({
      success: true,
      data: bookings.bookings,
      pagination: {
        currentPage: bookings.currentPage,
        totalPages: bookings.totalPages,
        totalItems: bookings.totalItems,
        hasNext: bookings.hasNext,
        hasPrev: bookings.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingStats = async (req, res, next) => {
  try {
    const stats = await adminService.getBookingStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

exports.getTodayBookingSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getTodayBookingSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await adminService.getBookingByIdAdmin(req.params.id);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

exports.createBookingForGuest = async (req, res, next) => {
  try {
    const guestId = req.params.guestId;
    const booking = await adminService.createBookingForGuest(req.body, guestId, req.user._id);
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully for guest'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, reason, notifyGuest = true, notifyHost = true } = req.body;
    const booking = await adminService.updateBookingStatusAdmin(req.params.id, status, reason, req.user._id, notifyGuest, notifyHost);
    res.json({
      success: true,
      data: booking,
      message: `Booking status updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason, refundAmount, refundReason, notifyGuest = true, notifyHost = true } = req.body;
    const result = await adminService.cancelBookingAdmin(req.params.id, {
      reason,
      refundAmount,
      refundReason,
      notifyGuest,
      notifyHost,
      cancelledBy: req.user._id
    });
    res.json({
      success: true,
      data: result,
      message: 'Booking cancelled successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.completeBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await adminService.completeBookingAdmin(req.params.id, reason, req.user._id);
    res.json({
      success: true,
      data: booking,
      message: 'Booking marked as completed'
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingsByGuest = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const bookings = await adminService.getBookingsByGuest(req.params.guestId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    res.json({
      success: true,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingsByHost = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const bookings = await adminService.getBookingsByHost(req.params.hostId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    res.json({
      success: true,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingActivity = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const activity = await adminService.getBookingActivity(req.params.id, parseInt(limit));
    res.json({
      success: true,
      data: activity
    });
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateBookingStatus = async (req, res, next) => {
  try {
    const { bookingIds, status, reason } = req.body;
    const result = await adminService.bulkUpdateBookingStatus(bookingIds, status, reason, req.user._id);
    res.json({
      success: true,
      data: result,
      message: `${result.updatedCount} bookings updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// PAYMENT MANAGEMENT CONTROLLERS
// ================================

exports.getAllPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      provider,
      bookingId,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const payments = await adminService.getAllPaymentsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      provider,
      bookingId,
      userId,
      startDate,
      endDate,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: payments.payments,
      pagination: {
        currentPage: payments.currentPage,
        totalPages: payments.totalPages,
        totalItems: payments.totalItems,
        hasNext: payments.hasNext,
        hasPrev: payments.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentStats = async (req, res, next) => {
  try {
    const stats = await adminService.getPaymentStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await adminService.getPaymentByIdAdmin(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    res.json({
      success: true,
      data: payment
    });
  } catch (err) {
    next(err);
  }
};

exports.generateInvoiceData = async (req, res, next) => {
  try {
    const invoiceData = await adminService.generateInvoiceData(req.params.id);
    res.json({
      success: true,
      data: invoiceData
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentReports = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day', provider } = req.query;
    const reports = await adminService.getPaymentReports({
      startDate,
      endDate,
      groupBy,
      provider
    });
    res.json({
      success: true,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

exports.processManualRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const refund = await adminService.processManualRefund(req.params.id, amount, reason, req.user._id);
    res.json({
      success: true,
      data: refund,
      message: 'Manual refund processed successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const payment = await adminService.updatePaymentStatusAdmin(req.params.id, status, reason, req.user._id);
    res.json({
      success: true,
      data: payment,
      message: `Payment status updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// DASHBOARD & ANALYTICS CONTROLLERS
// ================================

exports.getDashboardOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getDashboardOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (err) {
    next(err);
  }
};

exports.getDailyCounters = async (req, res, next) => {
  try {
    const counters = await adminService.getDailyCounters();
    res.json({
      success: true,
      data: counters
    });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    const analytics = await adminService.getRevenueAnalytics(period, groupBy);
    res.json({
      success: true,
      data: analytics
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserGrowthAnalytics = async (req, res, next) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    const analytics = await adminService.getUserGrowthAnalytics(period, groupBy);
    res.json({
      success: true,
      data: analytics
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookingTrends = async (req, res, next) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    const trends = await adminService.getBookingTrends(period, groupBy);
    res.json({
      success: true,
      data: trends
    });
  } catch (err) {
    next(err);
  }
};

exports.getTopPerformingListings = async (req, res, next) => {
  try {
    const { limit = 10, period = '30d' } = req.query;
    const listings = await adminService.getTopPerformingListings(parseInt(limit), period);
    res.json({
      success: true,
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

exports.getCriticalAlerts = async (req, res, next) => {
  try {
    const alerts = await adminService.getCriticalAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const metrics = await adminService.getDashboardMetrics(period);
    res.json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardActivities = async (req, res, next) => {
  try {
    const { limit = 20, type = 'all' } = req.query;
    const activities = await adminService.getDashboardActivities(parseInt(limit), type);
    res.json({
      success: true,
      data: activities
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// REPORTS CONTROLLERS
// ================================

exports.generateOverviewReport = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate, format = 'json' } = req.query;
    const report = await adminService.generateOverviewReport({
      period,
      startDate,
      endDate,
      format
    });
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.generateBookingReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json', ...filters } = req.query;
    const report = await adminService.generateBookingReport({
      startDate,
      endDate,
      format,
      ...filters
    });
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.generateRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json', groupBy = 'day' } = req.query;
    const report = await adminService.generateRevenueReport({
      startDate,
      endDate,
      format,
      groupBy
    });
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.generateListingReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json', ...filters } = req.query;
    const report = await adminService.generateListingReport({
      startDate,
      endDate,
      format,
      ...filters
    });
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.generateUserReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json', ...filters } = req.query;
    const report = await adminService.generateUserReport({
      startDate,
      endDate,
      format,
      ...filters
    });
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.exportBookingReport = async (req, res, next) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    const exportData = await adminService.exportBookingReport(format, filters);
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=booking-report.${format}`);
    res.send(exportData);
  } catch (err) {
    next(err);
  }
};

exports.exportRevenueReport = async (req, res, next) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    const exportData = await adminService.exportRevenueReport(format, filters);
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-report.${format}`);
    res.send(exportData);
  } catch (err) {
    next(err);
  }
};

// ================================
// IMAGE MANAGEMENT CONTROLLERS
// ================================

// Get listing images with admin details
exports.getListingImages = async (req, res, next) => {
  try {
    const result = await listingService.getListingImagesAdmin(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Update single listing image (admin)
exports.updateListingImage = async (req, res, next) => {
  try {
    const { id: listingId, imageId } = req.params;
    const result = await listingService.updateListingImage(listingId, imageId, req.body, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Delete single listing image (admin)
exports.deleteListingImage = async (req, res, next) => {
  try {
    const { id: listingId, imageId } = req.params;
    const result = await listingService.deleteListingImage(listingId, imageId, req.user._id);
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Bulk delete listing images (admin)
exports.bulkDeleteListingImages = async (req, res, next) => {
  try {
    const { id: listingId } = req.params;
    const { imageIds } = req.body;
    const result = await listingService.bulkDeleteListingImages(listingId, imageIds, req.user._id);
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Images deleted successfully',
      data: result,
      meta: { deletedCount: imageIds?.length || 0 }
    });
  } catch (error) {
    next(error);
  }
};

// Get image statistics for admin dashboard
exports.getImageStatistics = async (req, res, next) => {
  try {
    const stats = await listingService.getImageStatistics();
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Image statistics retrieved successfully',
      data: stats,
      meta: {
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get images pending review
exports.getImagesPendingReview = async (req, res, next) => {
  try {
    const result = await listingService.getImagesPendingReview(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Get flagged images report
exports.getFlaggedImages = async (req, res, next) => {
  try {
    const result = await listingService.getFlaggedImages(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Get image analytics over time
exports.getImageAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const analytics = await listingService.getImageAnalytics({
      startDate,
      endDate,
      status
    });
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Image analytics retrieved successfully',
      data: analytics,
      meta: {
        period: { startDate, endDate },
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin bulk image operations
exports.bulkImageOperations = async (req, res, next) => {
  try {
    const { operation, imageIds, adminNotes, notifyHost } = req.body;
    const result = await listingService.bulkImageOperations(
      req.params.id, 
      { operation, imageIds, adminNotes, notifyHost }, 
      req.user._id
    );
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `Bulk ${operation} operation completed successfully`,
      data: result,
      meta: {
        operation,
        affectedImages: imageIds.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin force set featured image
exports.forceSetFeaturedImage = async (req, res, next) => {
  try {
    const { isFeatured, isMainImage, adminNotes, forceUpdate } = req.body;
    const result = await listingService.forceSetFeaturedImage(
      req.params.id, 
      req.params.imageId, 
      { isFeatured, isMainImage, adminNotes, forceUpdate }, 
      req.user._id
    );
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Image featured status updated successfully',
      data: result,
      meta: {
        adminOverride: true,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin approve/reject/flag image
exports.updateImageStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, reviewComments } = req.body;
    const result = await listingService.updateImageStatus(
      req.params.id, 
      req.params.imageId, 
      { status, adminNotes, reviewComments }, 
      req.user._id
    );
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `Image ${status} successfully`,
      data: result,
      meta: {
        newStatus: status,
        reviewedBy: req.user._id,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate image thumbnails
exports.generateImageThumbnails = async (req, res, next) => {
  try {
    const { imageIds, sizes } = req.body;
    const result = await listingService.generateImageThumbnails(imageIds, sizes);
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Thumbnails generated successfully',
      data: result,
      meta: {
        processedImages: imageIds.length,
        thumbnailSizes: sizes.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Optimize images
exports.optimizeImages = async (req, res, next) => {
  try {
    const { quality, maxWidth, maxHeight, format } = req.body;
    const result = await listingService.optimizeImages(req.params.id, {
      quality,
      maxWidth,
      maxHeight,
      format
    });
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Images optimized successfully',
      data: result,
      meta: {
        optimizationSettings: { quality, maxWidth, maxHeight, format },
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Validate image quality
exports.validateImageQuality = async (req, res, next) => {
  try {
    const { checks } = req.body;
    const result = await listingService.validateImageQuality(req.params.imageId, checks);
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Image quality validation completed',
      data: result,
      meta: {
        checksPerformed: checks,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Filter images across platform
exports.filterImages = async (req, res, next) => {
  try {
    const result = await listingService.filterImagesAdmin(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Admin upload images to any listing
exports.adminUploadListingImages = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const userId = req.user._id;
    const files = req.files;
    const { descriptions, tags } = req.body;

    // Use the same service as host upload, but with admin override
    const result = await listingService.uploadListingImages({
      listingId,
      userId,
      files,
      descriptions,
      tags,
      isAdmin: true
    });

    res.status(201).json({
      status: 'success',
      statusCode: 201,
      message: 'Images uploaded successfully by admin',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
