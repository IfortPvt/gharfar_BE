const BookingService = require('../services/bookingService');
const BookingLogService = require('../services/bookingLogService');
const PaymentService = require('../services/paymentService');
const { validateRequest } = require('../middleware/validator');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// Create a new booking
exports.createBooking = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const booking = await BookingService.createBooking(req.body, userId);
    
    // Log booking creation
    await BookingLogService.logBookingCreated(
      booking,
      userId,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Get bookings for a user (guest or host)
exports.getBookingsByUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { userType = 'guest' } = req.query;
    
    const result = await BookingService.getBookingsByUser(req, userId, userType);
    
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Get a specific booking by ID
exports.getBookingById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const booking = await BookingService.getBookingById(req.params.id, userId);
    
    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

// Get a specific booking by readable ID
exports.getBookingByReadableId = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const booking = await BookingService.getBookingByReadableId(req.params.bookingId, userId);
    
    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const userId = req.user._id; // use authenticated user
    const { status } = req.body;
    const { userType = 'host' } = req.query; // Usually hosts approve/decline
    
    const booking = await BookingService.updateBookingStatus(
      req.params.id, 
      status, 
      userId, 
      userType
    );
    
    res.json({
      success: true,
      data: booking,
      message: `Booking ${status} successfully`
    });
  } catch (err) {
    next(err);
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const userId = req.user._id; // use authenticated user
    const { reason = '', userType = 'guest' } = req.body;
    
    const result = await BookingService.cancelBooking(req.params.id, userId, userType, reason);
    
    res.json({
      success: true,
      data: result.booking,
      refundDetails: result.refundDetails,
      message: 'Booking cancelled successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Check availability for specific dates
exports.checkAvailability = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const checkIn = req.query.checkIn || req.query.checkInDate;
    const checkOut = req.query.checkOut || req.query.checkOutDate;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }
    
    const isAvailable = await BookingService.checkAvailability(listingId, checkIn, checkOut);
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        checkIn,
        checkOut,
        listingId
      }
    });
  } catch (err) {
    next(err);
  }
};

// Calculate booking price
exports.calculateBookingPrice = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const checkIn = req.query.checkIn || req.query.checkInDate;
    const checkOut = req.query.checkOut || req.query.checkOutDate;
    const { guests = 1, pets = 0 } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }
    
    // Get listing first
    const Listing = require('../models/Listing');
    const listing = await Listing.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }
    
    const pricing = await BookingService.calculateBookingPrice(
      listing, 
      checkIn, 
      checkOut, 
      Number(guests), 
      Number(pets)
    );
    
    res.json({
      success: true,
      data: pricing,
      message: 'Price calculated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Get upcoming bookings
exports.getUpcomingBookings = async (req, res, next) => {
  try {
    // TODO: Get user ID from auth middleware
    const userId = "6876b2bc9c70873aae5260d3"; // Temporary hardcoded
    const { userType = 'guest' } = req.query;
    
    const bookings = await BookingService.getUpcomingBookings(userId, userType);
    
    res.json({
      success: true,
      data: bookings,
      count: bookings.length,
      message: 'Upcoming bookings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Get past bookings
exports.getPastBookings = async (req, res, next) => {
  try {
    // TODO: Get user ID from auth middleware
    const userId = "6876b2bc9c70873aae5260d3"; // Temporary hardcoded
    const { userType = 'guest' } = req.query;
    
    const bookings = await BookingService.getPastBookings(userId, userType);
    
    res.json({
      success: true,
      data: bookings,
      count: bookings.length,
      message: 'Past bookings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Get bookings with pets
exports.getBookingsWithPets = async (req, res, next) => {
  try {
    const result = await BookingService.getBookingsWithPets(req);
    
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Search bookings
exports.searchBookings = async (req, res, next) => {
  try {
    const result = await BookingService.searchBookings(req);
    
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Check-in endpoint
exports.checkIn = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const booking = await BookingService.updateCheckInDetails(
      req.params.id, 
      req.body, 
      userId
    );
    
    // Log check-in
    await BookingLogService.logCheckIn(
      booking,
      req.body.actualCheckIn || new Date(),
      req.body.checkInMethod || 'manual',
      {
        user: userId,
        role: req.user.role,
        name: req.user.fullName
      },
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );
    
    res.json({
      success: true,
      data: booking,
      message: 'Check-in successful'
    });
  } catch (err) {
    next(err);
  }
};

// Check-out endpoint
exports.checkOut = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const booking = await BookingService.updateCheckOutDetails(
      req.params.id, 
      req.body, 
      userId
    );
    
    // Log check-out
    await BookingLogService.logCheckOut(
      booking,
      req.body.actualCheckOut || new Date(),
      req.body.propertyCondition || 'good',
      req.body.damages || [],
      {
        user: userId,
        role: req.user.role,
        name: req.user.fullName
      },
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );
    
    res.json({
      success: true,
      data: booking,
      message: 'Check-out successful'
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Update booking status with logging
exports.adminUpdateBookingStatus = async (req, res, next) => {
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
    const { status, reason, notifyGuest = true, notifyHost = true } = req.body;
    
    // Get current booking
    const booking = await Booking.findById(bookingId).populate('listing');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const previousStatus = booking.status;
    
    // Update booking status
    booking.status = status;
    if (reason) {
      booking.adminNotes = booking.adminNotes || [];
      booking.adminNotes.push({
        note: reason,
        createdBy: req.user._id,
        createdAt: new Date()
      });
    }
    
    await booking.save();
    
    // Log the status change
    await BookingLogService.logAdminStatusUpdate(
      booking,
      req.user._id,
      previousStatus,
      status,
      reason,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );
    
    // Handle availability based on status
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      try {
        await PaymentService.blockAvailability(booking._id);
        await BookingLogService.logAvailabilityBlocked(booking, booking.listing._id, {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });
      } catch (error) {
        console.error('Failed to block availability:', error);
      }
    } else if (status === 'cancelled' && ['confirmed', 'checked-in'].includes(previousStatus)) {
      try {
        await PaymentService.releaseAvailability(booking._id);
        await BookingLogService.logAvailabilityReleased(booking, booking.listing._id, 'Admin cancellation', {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });
      } catch (error) {
        console.error('Failed to release availability:', error);
      }
    }
    
    res.json({
      success: true,
      data: booking,
      message: `Booking status updated to ${status}`
    });
    
  } catch (err) {
    next(err);
  }
};

// Host: Update booking status
exports.hostUpdateBookingStatus = async (req, res, next) => {
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
    const { status, response } = req.body;
    
    // Get booking and verify host ownership
    const booking = await Booking.findById(bookingId).populate('listing');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.listing.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only update bookings for your own listings'
      });
    }
    
    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'declined'],
      confirmed: ['cancelled', 'checked-in'],
      'checked-in': ['checked-out']
    };
    
    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking from ${booking.status} to ${status}`
      });
    }
    
    const previousStatus = booking.status;
    
    // Update booking
    booking.status = status;
    if (response) {
      booking.hostResponse = response;
    }
    
    await booking.save();
    
    // Log the action
    if (status === 'confirmed') {
      await BookingLogService.logBookingConfirmed(
        booking,
        req.user._id,
        response,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      );
      
      // Block availability
      try {
        await PaymentService.blockAvailability(booking._id);
        await BookingLogService.logAvailabilityBlocked(booking, booking.listing._id, {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });
      } catch (error) {
        console.error('Failed to block availability:', error);
      }
      
    } else {
      await BookingLogService.logBookingAction({
        booking: booking._id,
        action: `booking_${status}`,
        performedBy: {
          user: req.user._id,
          role: 'host',
          name: req.user.fullName
        },
        previousStatus,
        newStatus: status,
        details: {
          message: `Booking ${status} by host`,
          reason: response
        },
        systemInfo: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        },
        severity: 'high',
        tags: ['host_action', 'status_update']
      });
    }
    
    res.json({
      success: true,
      data: booking,
      message: `Booking ${status} successfully`
    });
    
  } catch (err) {
    next(err);
  }
};

// Get booking logs
exports.getBookingLogs = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { limit = 50 } = req.query;
    
    // Get booking and verify access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check access permissions
    const hasAccess = req.user.role === 'admin' || 
                     booking.guest.toString() === req.user._id.toString() ||
                     (req.user.role === 'host' && booking.listing?.host?.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to booking logs'
      });
    }
    
    const logs = await BookingLogService.getBookingLogs(bookingId, limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
    
  } catch (err) {
    next(err);
  }
};

// Admin: Get all bookings with filters
exports.adminGetAllBookings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      hostId,
      guestId,
      listingId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (hostId) query.host = hostId;
    if (guestId) query.guest = guestId;
    if (listingId) query.listing = listingId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const bookings = await Booking.find(query)
      .populate('guest', 'fullName email phone')
      .populate('listing', 'title host')
      .populate('listing.host', 'fullName email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Booking.countDocuments(query);
    
    // Get summary statistics
    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          avgBookingValue: { $avg: '$pricing.totalAmount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        summary: stats[0] || {
          totalBookings: 0,
          totalRevenue: 0,
          avgBookingValue: 0,
          confirmedBookings: 0,
          cancelledBookings: 0
        }
      }
    });
    
  } catch (err) {
    next(err);
  }
};

// Admin: Force cancel booking with refund
exports.adminCancelBooking = async (req, res, next) => {
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
    const { reason, refundAmount, notifyGuest = true, notifyHost = true } = req.body;
    
    const booking = await Booking.findById(bookingId).populate('listing');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const previousStatus = booking.status;
    
    // Update booking status
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: reason,
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      cancellationPolicy: 'admin_override',
      refundAmount: refundAmount || 0
    };
    
    await booking.save();
    
    // Process refund if amount specified
    if (refundAmount > 0) {
      try {
        const payment = await Payment.findOne({ booking: bookingId, status: 'completed' });
        if (payment) {
          await PaymentService.processRefund(
            payment._id,
            refundAmount,
            `Admin cancellation: ${reason}`,
            req.user._id,
            {
              userAgent: req.headers['user-agent'],
              ipAddress: req.ip
            }
          );
        }
      } catch (error) {
        console.error('Failed to process refund:', error);
        // Continue with cancellation even if refund fails
      }
    }
    
    // Release availability
    try {
      await PaymentService.releaseAvailability(booking._id);
      await BookingLogService.logAvailabilityReleased(booking, booking.listing._id, 'Admin cancellation', {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });
    } catch (error) {
      console.error('Failed to release availability:', error);
    }
    
    // Log cancellation
    await BookingLogService.logBookingCancelled(
      booking,
      req.user._id,
      'admin',
      reason,
      refundAmount,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled by admin'
    });
    
  } catch (err) {
    next(err);
  }
};

// Get recent booking activity (admin only)
exports.getRecentBookingActivity = async (req, res, next) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    
    const logs = await BookingLogService.getRecentActivity(hours, limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      message: `Recent activity for last ${hours} hours`
    });
    
  } catch (err) {
    next(err);
  }
};

// Get critical booking issues (admin only)
exports.getCriticalBookingIssues = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    
    const logs = await BookingLogService.getCriticalLogs(limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      message: 'Critical booking issues retrieved'
    });
    
  } catch (err) {
    next(err);
  }
};

// Validation rules
exports.adminUpdateBookingStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'declined', 'cancelled', 'checked-in', 'checked-out']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10-500 characters')
];

exports.hostUpdateBookingStatusValidation = [
  body('status').isIn(['confirmed', 'declined', 'cancelled', 'checked-in', 'checked-out']).withMessage('Invalid status'),
  body('response').optional().isLength({ max: 1000 }).withMessage('Response too long')
];

exports.adminCancelBookingValidation = [
  body('reason').notEmpty().withMessage('Cancellation reason is required').isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10-500 characters'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be non-negative')
];
