const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validator');
const { pagination } = require('../middleware/pagination');
const { sorting } = require('../middleware/sorting');
const { 
  validateListing, 
  validateSearchParams,
  validateNearbySearch,
  validateAvailabilityCheck,
  validateImageOrder, 
  validateAmenities,
  validateAvailabilityPeriod,
  validateBulkAvailability,
  validateAvailabilityPeriodUpdate,
  // add update validator
  validateListingUpdate
} = require('../validators/listingValidator');

// =================================
// PUBLIC ROUTES (No auth required)
// =================================

router.get('/', 
  pagination(10, 50),
  sorting(['createdAt', 'updatedAt', 'title', 'price'], { createdAt: -1 }),
  listingController.getAllListings
);

router.get('/search', [
  pagination(20, 100),
  sorting(['createdAt', 'price', 'title'], { createdAt: -1 }),
  validateSearchParams,
  validateRequest
], listingController.searchListings);

router.get('/nearby', [
  pagination(20, 50),
  sorting(['createdAt'], { createdAt: -1 }),
  validateNearbySearch,
  validateRequest
], listingController.getNearbyListings);

router.get('/pet-friendly', 
  pagination(10, 50),
  sorting(['createdAt', 'price'], { createdAt: -1 }),
  listingController.getPetFriendlyListings
);

router.get('/accessibility-friendly', 
  pagination(10, 50),
  sorting(['createdAt', 'price'], { createdAt: -1 }),
  listingController.getAccessibilityFriendlyListings
);

router.get('/location', 
  pagination(10, 50),
  sorting(['createdAt', 'price'], { createdAt: -1 }),
  listingController.getListingsByLocation
);

router.get('/featured', 
  pagination(10, 20),
  sorting(['updatedAt', 'createdAt'], { updatedAt: -1 }),
  listingController.getFeaturedListings
);

router.get('/recent', 
  pagination(10, 50),
  sorting(['createdAt'], { createdAt: -1 }),
  listingController.getRecentListings
);

router.get('/readable/:readableId', listingController.getListingByReadableId);

// =================================
// PROTECTED ROUTES (Auth required)
// =================================

router.get('/host/my-listings', [
  auth,
  authorizeRoles('host', 'landlord', 'admin'),
  pagination(10, 50),
  sorting(['createdAt', 'updatedAt', 'title', 'price'], { createdAt: -1 })
], listingController.getHostListings);

// =================================
// INDIVIDUAL LISTING ROUTES
// =================================

router.get('/:id', listingController.getListingById);

router.get('/:id/availability', [
  validateAvailabilityCheck,
  validateRequest
], listingController.checkAvailability);

router.get('/:id/similar', listingController.getSimilarListings);

router.get('/:id/statistics', [
  auth,
  authorizeRoles('host', 'landlord', 'admin')
], listingController.getListingStatistics);

router.get('/:listingId/calculate-price', listingController.calculateTotalPrice);

router.get('/:listingId/amenities', listingController.getListingAmenities);

// =================================
// LISTING CRUD OPERATIONS
// =================================

router.post('/', [
  auth,
  authorizeRoles('host', 'landlord', 'admin', 'content_manager'),
  upload.array('images', 10),
  handleUploadError,
  validateListing,
  validateRequest
], listingController.createListing);

router.put('/:id', [
  auth,
  authorizeRoles('host', 'landlord', 'admin', 'content_manager'),
  validateListingUpdate,
  validateRequest
], listingController.updateListing);

router.delete('/:id', [
  auth
], listingController.deleteListing);

// =================================
// LISTING STATUS MANAGEMENT
// =================================

router.put('/:id/deactivate', [
  auth,
  authorizeRoles('host', 'landlord', 'admin')
], listingController.deactivateListing);

router.put('/:id/reactivate', [
  auth,
  authorizeRoles('host', 'landlord', 'admin')
], listingController.reactivateListing);

// =================================
// IMAGE MANAGEMENT ROUTES
// =================================

router.get('/:id/images', [
  auth,
  pagination(10, 50),
  validateRequest
], listingController.getListingImages);

router.post('/:id/images', [
  auth,
  upload.array('images', 10),
  handleUploadError,
  validateRequest
], listingController.addListingImages);

router.put('/:id/images/order', [
  auth,
  validateImageOrder,
  validateRequest
], listingController.updateImageOrder);

router.delete('/:id/images/:imageId', [
  auth,
  validateRequest
], listingController.deleteListingImage);

router.put('/:id/images/:imageId', [
  auth,
  validateRequest
], listingController.updateListingImage);

router.delete('/:id/images/bulk-delete', [
  auth,
  validateRequest
], listingController.bulkDeleteListingImages);

router.get('/images/search', [
  auth,
  pagination(20, 100),
  validateRequest
], listingController.searchImages);

module.exports = router;