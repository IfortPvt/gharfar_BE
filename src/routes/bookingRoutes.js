const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middleware/validator');
const { pagination } = require('../middleware/pagination');
const { sorting } = require('../middleware/sorting');

// Public availability check
router.get('/availability/:listingId', bookingController.checkAvailability);
router.get('/calculate-price/:listingId', bookingController.calculateBookingPrice);

// Search and filter endpoints (can be public or authenticated)
router.get('/search', 
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'checkIn', 'checkOut', 'status', 'totalPrice'] }),
  bookingController.searchBookings
);

router.get('/with-pets', 
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'checkIn', 'checkOut', 'totalPrice'] }),
  bookingController.getBookingsWithPets
);

// Apply authentication to all routes below
router.use(auth);

// Authenticated user booking management
router.post('/', 
  bookingController.createBooking
);

router.get('/my', 
  pagination({ defaultLimit: 20 }),
  sorting({ allowedFields: ['createdAt', 'checkIn', 'checkOut', 'status', 'totalPrice'] }),
  bookingController.getBookingsByUser
);

router.get('/upcoming', 
  bookingController.getUpcomingBookings
);

router.get('/past', 
  bookingController.getPastBookings
);

// Get booking by human-readable ID
router.get('/booking/:bookingId', 
  bookingController.getBookingByReadableId
);

// Get booking logs
router.get('/:bookingId/logs',
  bookingController.getBookingLogs
);

// Host-specific routes
router.put('/host/:bookingId/status',
  authorizeRoles('host'),
  bookingController.hostUpdateBookingStatusValidation,
  bookingController.hostUpdateBookingStatus
);

// Admin-specific routes
router.get('/admin/all',
  authorizeRoles('admin'),
  bookingController.adminGetAllBookings
);

router.put('/admin/:bookingId/status',
  authorizeRoles('admin'),
  bookingController.adminUpdateBookingStatusValidation,
  bookingController.adminUpdateBookingStatus
);

router.put('/admin/:bookingId/cancel',
  authorizeRoles('admin'),
  bookingController.adminCancelBookingValidation,
  bookingController.adminCancelBooking
);

router.get('/admin/activity/recent',
  authorizeRoles('admin'),
  bookingController.getRecentBookingActivity
);

router.get('/admin/issues/critical',
  authorizeRoles('admin'),
  bookingController.getCriticalBookingIssues
);

// Standard booking operations
router.get('/:id', 
  bookingController.getBookingById
);

router.put('/:id/status', 
  bookingController.updateBookingStatus
);

router.put('/:id/cancel', 
  bookingController.cancelBooking
);

// Check-in/Check-out management
router.put('/:id/checkin', 
  bookingController.checkIn
);

router.put('/:id/checkout', 
  bookingController.checkOut
);

module.exports = router;
