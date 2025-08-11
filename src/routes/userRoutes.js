const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middleware/upload');
// const { validateUser } = require('../validators/userValidator');

// ================================
// PUBLIC ROUTES (No Authentication)
// ================================

// User registration and login
router.post('/register', /*validateUser,*/ UserController.register);
router.post('/login', UserController.login);

// Token verification
router.post('/verify-token', UserController.verifyToken);

// Public profile viewing
router.get('/profile/:userId', UserController.getPublicProfile);

// ================================
// AUTHENTICATED ROUTES
// ================================

// Apply authentication to all routes below
router.use(auth);

// ================================
// PROFILE MANAGEMENT
// ================================

// Get current user profile
router.get('/me', UserController.getProfile);

// Update user profile
router.put('/me', UserController.updateProfile);

// Upload profile picture
router.post('/me/profile-picture', 
  upload.single('profilePicture'), 
  UserController.uploadProfilePicture
);

// Change password
router.put('/me/password', UserController.changePassword);

// Delete account
router.delete('/me', UserController.deleteAccount);

// Email verification
router.post('/me/verify-email', UserController.verifyEmail);

// ================================
// USER ACTIVITY & HISTORY
// ================================

// Get user activity logs
router.get('/me/activity', UserController.getUserActivity);

// Get user reviews (received and given)
router.get('/me/reviews', UserController.getUserReviews);

// ================================
// HOST-SPECIFIC ROUTES
// ================================

// Get host's listings
router.get('/me/listings', 
  authorizeRoles('host', 'landlord', 'admin', 'superadmin'),
  UserController.getHostListings
);

// Get host's bookings
router.get('/me/bookings', 
  authorizeRoles('host', 'landlord', 'admin', 'superadmin'),
  UserController.getHostBookings
);

// ================================
// ADMIN ROUTES
// ================================

// User statistics (admin only)
router.get('/statistics',
  auth,
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').getUserStatistics
);

// Get user activity by ID (admin only)
router.get('/:userId/activity',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').getUserActivity
);

// Verify user email (admin only)
router.post('/:userId/verify-email',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').verifyUserEmail
);

// Add admin note to user
router.post('/:userId/notes',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').addUserNote
);

// Flag user
router.post('/:userId/flag',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').flagUser
);

// Suspend user
router.put('/:userId/suspend',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').suspendUser
);

// Reactivate user
router.put('/:userId/reactivate',
  authorizeRoles('admin', 'superadmin'),
  require('../controllers/adminController').reactivateUser
);

module.exports = router;
