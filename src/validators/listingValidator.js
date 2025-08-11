const { body, query, param } = require('express-validator');
const mongoose = require('mongoose');

exports.validateListing = [
  // Core fields
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('listingType')
    .isIn(['Home', 'Experience', 'Service'])
    .withMessage('Listing type must be Home, Experience, or Service'),
  
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  // Pricing
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number'),
  
  // Location
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),
  
  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  
  body('state')
    .optional()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),
  
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  // Common fields
  body('maxGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max guests must be at least 1'),
  
  body('minGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min guests must be at least 1'),
  
  body('duration')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Duration must not exceed 50 characters'),
  
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  
  body('includes')
    .optional()
    .isArray()
    .withMessage('Includes must be an array'),
  
  body('highlights')
    .optional()
    .isArray()
    .withMessage('Highlights must be an array'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  
  // Type-specific validations
  body('homeDetails.bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative integer'),
  
  body('homeDetails.bathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  
  body('homeDetails.roomType')
    .optional()
    .isIn(['Entire place', 'Private room', 'Shared room'])
    .withMessage('Invalid room type'),
  
  body('experienceDetails.skillLevel')
    .optional()
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'All levels'])
    .withMessage('Invalid skill level'),
  
  body('experienceDetails.ageRestriction')
    .optional()
    .isIn(['All ages', '18+', '21+', 'Custom'])
    .withMessage('Invalid age restriction'),
  
  body('serviceDetails.serviceType')
    .optional()
    .isIn(['Consultation', 'Installation', 'Maintenance', 'Delivery', 'Other'])
    .withMessage('Invalid service type'),
  
  body('serviceDetails.travelRadius')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Travel radius must be a non-negative number'),
  
  // Arrays
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
    .custom((value) => {
      return value.every(amenityId => 
        mongoose.Types.ObjectId.isValid(amenityId)
      );
    })
    .withMessage('Invalid amenity IDs')
];

// Update validator: all fields optional; validate only if present
exports.validateListingUpdate = [
  body('title')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('description')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),

  body('listingType')
    .optional()
    .isIn(['Home', 'Experience', 'Service'])
    .withMessage('Listing type must be Home, Experience, or Service'),

  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number'),

  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('state')
    .optional()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('maxGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max guests must be at least 1'),

  body('minGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min guests must be at least 1'),

  body('duration')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Duration must not exceed 50 characters'),

  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),

  body('includes')
    .optional()
    .isArray()
    .withMessage('Includes must be an array'),

  body('highlights')
    .optional()
    .isArray()
    .withMessage('Highlights must be an array'),

  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),

  body('homeDetails.bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative integer'),

  body('homeDetails.bathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),

  body('homeDetails.roomType')
    .optional()
    .isIn(['Entire place', 'Private room', 'Shared room'])
    .withMessage('Invalid room type'),

  body('experienceDetails.skillLevel')
    .optional()
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'All levels'])
    .withMessage('Invalid skill level'),

  body('experienceDetails.ageRestriction')
    .optional()
    .isIn(['All ages', '18+', '21+', 'Custom'])
    .withMessage('Invalid age restriction'),

  body('serviceDetails.serviceType')
    .optional()
    .isIn(['Consultation', 'Installation', 'Maintenance', 'Delivery', 'Other'])
    .withMessage('Invalid service type'),

  body('serviceDetails.travelRadius')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Travel radius must be a non-negative number'),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
    .custom((value) => {
      return value.every(amenityId => 
        mongoose.Types.ObjectId.isValid(amenityId)
      );
    })
    .withMessage('Invalid amenity IDs')
];

exports.validateSearchParams = [
  query('listingType')
    .optional()
    .isIn(['Home', 'Experience', 'Service'])
    .withMessage('Invalid listing type'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a positive number'),
  
  query('maxGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max guests must be at least 1'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'title', 'maxGuests'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

exports.validateNearbySearch = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Radius must be between 0 and 100000 meters')
];

exports.validateAvailabilityCheck = [
  param('id')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  
  query('checkIn')
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),
  
  query('checkOut')
    .isISO8601()
    .withMessage('Check-out date must be a valid date')
    .custom((checkOut, { req }) => {
      const checkIn = new Date(req.query.checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  
  query('guests')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of guests must be between 1 and 50')
];

exports.validateImageOrder = [
  body('imageOrder')
    .isArray()
    .withMessage('Image order must be an array')
    .custom((value) => {
      return value.every(item => 
        mongoose.Types.ObjectId.isValid(item.imageId) && 
        Number.isInteger(item.order) &&
        item.order >= 0
      );
    })
    .withMessage('Invalid image order format')
];

exports.validateAmenities = [
  body('amenities')
    .isArray()
    .withMessage('Amenities must be an array')
    .custom((value) => {
      return value.every(amenityId => 
        mongoose.Types.ObjectId.isValid(amenityId)
      );
    })
    .withMessage('Invalid amenity IDs')
];

exports.validateNearbySearch = [
  query('lat').isFloat().withMessage('Invalid latitude'),
  query('lng').isFloat().withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Invalid radius')
];

// Availability Management Validators

exports.validateAvailabilityPeriod = [
  body('start')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
  
  body('end')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be in ISO8601 format')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.start);
      const end = new Date(endDate);
      if (end <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  
  body('specialPricing')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Special pricing must be a positive number')
  ];

exports.validateBulkAvailability = [
  body('availability')
    .isArray({ min: 1 })
    .withMessage('Availability must be an array with at least one period'),
  
  body('availability.*.start')
    .notEmpty()
    .withMessage('Start date is required for each period')
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
  
  body('availability.*.end')
    .notEmpty()
    .withMessage('End date is required for each period')
    .isISO8601()
    .withMessage('End date must be in ISO8601 format'),
  
  body('availability.*.isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  
  body('availability.*.specialPricing')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Special pricing must be a positive number'),
  
  // Custom validator to check for overlapping periods
  body('availability')
    .custom((availability) => {
      for (let i = 0; i < availability.length; i++) {
        for (let j = i + 1; j < availability.length; j++) {
          const period1Start = new Date(availability[i].start);
          const period1End = new Date(availability[i].end);
          const period2Start = new Date(availability[j].start);
          const period2End = new Date(availability[j].end);
          
          // Check for overlap
          if (period1Start < period2End && period1End > period2Start) {
            throw new Error(`Availability periods ${i + 1} and ${j + 1} overlap`);
          }
        }
      }
      return true;
    })
];

exports.validateAvailabilityPeriodUpdate = [
  body('start')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
  
  body('end')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO8601 format'),
  
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  
  body('specialPricing')
    .optional()
    .custom((value) => {
      if (value === null) return true; // Allow null to remove special pricing
      if (typeof value === 'number' && value >= 0) return true;
      throw new Error('Special pricing must be a positive number or null');
    })
];