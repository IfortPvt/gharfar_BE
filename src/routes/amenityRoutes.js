const express = require('express');
const router = express.Router();
const amenityController = require('../controllers/amenityController');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { pagination } = require('../middleware/pagination');
const { sorting } = require('../middleware/sorting');
// const { validateRequest } = require('../middleware/validator');
// const { validateAmenity } = require('../validators/amenityValidator');

// Public routes for getting amenities
router.get('/', 
  pagination({ defaultLimit: 50 }),
  sorting({ allowedFields: ['name', 'category', 'sortOrder', 'createdAt'] }),
  amenityController.getAllAmenities
);

router.get('/search', 
  pagination({ defaultLimit: 30 }),
  sorting({ allowedFields: ['name', 'category', 'sortOrder'] }),
  amenityController.searchAmenities
);

router.get('/grouped', amenityController.getAmenitiesGrouped);
router.get('/category/:category', amenityController.getAmenitiesByCategory);
router.get('/key/:key', amenityController.getAmenityByKey);
router.post('/by-keys', amenityController.getAmenitiesByKeys);

// Admin only routes
router.post('/', [
  // auth,
  // isAdmin,
  // validateAmenity,
  // validateRequest
], amenityController.createAmenity);

router.put('/:id', [
  auth,
  authorizeRoles('admin'),
  // validateAmenity,
  // validateRequest
], amenityController.updateAmenity);

router.delete('/:id', [
  auth,
  authorizeRoles('admin')
], amenityController.deleteAmenity);

// Seed default amenities (Admin only)
router.post('/seed', [
  auth,
  authorizeRoles('admin')
], amenityController.seedDefaultAmenities);

module.exports = router;