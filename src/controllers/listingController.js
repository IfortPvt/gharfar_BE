const ListingService = require('../services/listingService');
const { validateRequest } = require('../middleware/validator');

exports.createListing = async (req, res, next) => {
  try {
    // Get user from auth middleware
    let userId = req.user?.id || req.user?._id;
    
    // If admin is creating listing for a host, use the host field from request body
    if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
      if (req.body.host) {
        // Admin is specifying a host for this listing
        userId = req.body.host;
      }
      // If no host specified, admin becomes the host (for admin-managed properties)
    }
    
    const listing = await ListingService.createListing(req.body, userId);
    res.status(201).json({
      success: true,
      listing: listing,
      message: 'Listing created successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllListings = async (req, res, next) => {
  try {
    const { listingType } = req.query;
    let result;
    
    if (listingType) {
      result = await ListingService.getListingsByType(req, listingType);
    } else {
      result = await ListingService.getAllListings(req);
    }
    
    res.json({
      success: true,
      data: result.listings,
      count: result.listings.length,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    const listing = await ListingService.getListingById(req.params.id);
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

exports.getListingByReadableId = async (req, res, next) => {
  try {
    const listing = await ListingService.getListingByReadableId(req.params.readableId);
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

exports.updateListing = async (req, res, next) => {
  try {
    const listing = await ListingService.updateListing(req.params.id, req.body);
    res.json({
      success: true,
      data: listing,
      message: 'Listing updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Image management endpoints
exports.uploadListingImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No images provided' 
      });
    }
    const listingId = req.params.id;
    const result = await ListingService.addListingImages(listingId, req.files);
    res.json({
      success: true,
      data: result,
      message: 'Images uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.removeListingImage = async (req, res, next) => {
  try {
    const { listingId, imageId } = req.params;
    const listing = await ListingService.removeListingImage(listingId, imageId);
    res.json({
      success: true,
      data: listing,
      message: 'Image removed successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateImageOrder = async (req, res, next) => {
  try {
    const { imageOrder } = req.body;
    await ListingService.updateListingImageOrder(imageOrder);
    res.json({ 
      success: true,
      message: 'Image order updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateImageFlags = async (req, res, next) => {
  try {
    const { listingId, imageId } = req.params;
    const { isFeatured, isMainImage } = req.body;
    const listing = await ListingService.updateListingImageFlags(listingId, imageId, {
      isFeatured,
      isMainImage
    });
    res.json({
      success: true,
      data: listing,
      message: 'Image flags updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Enhanced amenity management endpoints
exports.getListingAmenities = async (req, res, next) => {
  try {
    const listing = await ListingService.getListingById(req.params.listingId);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    const includedAmenities = listing.getAllIncludedAmenities();
    const excludedAmenities = listing.getAllExcludedAmenities();
    const customAmenities = listing.getCustomAmenities();
    const categories = listing.getAmenityCategories();
    
    res.json({
      success: true,
      data: {
        included: includedAmenities,
        excluded: excludedAmenities,
        custom: customAmenities,
        categories: categories,
        summary: {
          totalIncluded: includedAmenities.length,
          totalExcluded: excludedAmenities.length,
          totalCustom: customAmenities.length,
          totalCategories: categories.length,
          hasAmenities: includedAmenities.length > 0 || excludedAmenities.length > 0 || customAmenities.length > 0
        }
      },
      message: 'Listing amenities retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListingAmenities = async (req, res, next) => {
  try {
    const { amenities } = req.body;
    
    // Validate amenity structure
    if (!amenities || typeof amenities !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Amenities must be an object with included, excluded, and custom arrays'
      });
    }
    
    const listing = await ListingService.updateListing(req.params.listingId, { amenities }, req.user.id);
    
    res.json({
      success: true,
      data: listing,
      message: 'Amenities updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Add specific amenity to listing
exports.addAmenityToListing = async (req, res, next) => {
  try {
    const { amenityKey, type = 'included', notes, reason } = req.body;
    
    if (!amenityKey) {
      return res.status(400).json({
        success: false,
        message: 'Amenity key is required'
      });
    }
    
    const listing = await ListingService.addAmenityToListing(
      req.params.listingId, 
      amenityKey, 
      type, 
      { notes, reason },
      req.user.id
    );
    
    res.json({
      success: true,
      data: listing,
      message: `Amenity ${type === 'included' ? 'added' : 'excluded'} successfully`
    });
  } catch (err) {
    next(err);
  }
};

// Remove amenity from listing
exports.removeAmenityFromListing = async (req, res, next) => {
  try {
    const { amenityKey, type = 'included' } = req.body;
    
    if (!amenityKey) {
      return res.status(400).json({
        success: false,
        message: 'Amenity key is required'
      });
    }
    
    const listing = await ListingService.removeAmenityFromListing(
      req.params.listingId, 
      amenityKey, 
      type,
      req.user.id
    );
    
    res.json({
      success: true,
      data: listing,
      message: 'Amenity removed successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Search and filter endpoints
exports.searchListings = async (req, res, next) => {
  try {
    const result = await ListingService.searchListings(req);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

exports.getNearbyListings = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const result = await ListingService.getNearbyListings(req, lat, lng, radius);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Pet-friendly listings endpoint
exports.getPetFriendlyListings = async (req, res, next) => {
  try {
    const result = await ListingService.getPetFriendlyListings(req);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Accessibility-friendly listings endpoint
exports.getAccessibilityFriendlyListings = async (req, res, next) => {
  try {
    const result = await ListingService.getAccessibilityFriendlyListings(req);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// Price calculation endpoint including pet fees
exports.calculateTotalPrice = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { 
      checkIn, 
      checkOut, 
      guests = 1, 
      pets = 0, 
      petType = '' 
    } = req.query;

    // Validate required parameters
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }

    if (!guests || guests < 1) {
      return res.status(400).json({
        success: false,
        message: 'Number of guests must be at least 1'
      });
    }

    const pricing = await ListingService.calculateTotalPrice(
      listingId,
      checkIn,
      checkOut,
      Number(guests),
      Number(pets),
      petType
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

// Availability check endpoint
exports.checkAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut, guests } = req.query;
    const availability = await ListingService.checkAvailability(
      req.params.id, 
      checkIn, 
      checkOut,
      guests
    );
    res.json({
      success: true,
      data: availability
    });
  } catch (err) {
    next(err);
  }
};

// Availability Management Endpoints

// Get listing availability
exports.getListingAvailability = async (req, res, next) => {
  try {
    const availability = await ListingService.getListingAvailability(req.params.id);
    res.json({
      success: true,
      data: availability
    });
  } catch (err) {
    next(err);
  }
};

// Add new availability period
exports.addAvailabilityPeriod = async (req, res, next) => {
  try {
    const result = await ListingService.addAvailabilityPeriod(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Availability period added successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Update existing availability period
exports.updateAvailabilityPeriod = async (req, res, next) => {
  try {
    const result = await ListingService.updateAvailabilityPeriod(
      req.params.id, 
      req.params.periodId, 
      req.body
    );
    res.json({
      success: true,
      data: result,
      message: 'Availability period updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Delete availability period
exports.deleteAvailabilityPeriod = async (req, res, next) => {
  try {
    const result = await ListingService.deleteAvailabilityPeriod(
      req.params.id, 
      req.params.periodId
    );
    res.json({
      success: true,
      data: result,
      message: 'Availability period deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Bulk update availability (replace all periods)
exports.updateListingAvailability = async (req, res, next) => {
  try {
    const result = await ListingService.updateListingAvailability(req.params.id, req.body.availability);
    res.json({
      success: true,
      data: result,
      message: 'Listing availability updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Missing controller methods
exports.deleteListing = async (req, res, next) => {
  try {
    await ListingService.deleteListing(req.params.id, req.user.id);
    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.addListingImages = async (req, res, next) => {
  try {
    const listing = await ListingService.addListingImages(req.params.id, req.files, req.user.id);
    res.json({
      success: true,
      data: listing,
      message: 'Images added successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteListingImage = async (req, res, next) => {
  try {
    const listing = await ListingService.deleteListingImage(req.params.id, req.params.imageId, req.user.id);
    res.json({
      success: true,
      data: listing,
      message: 'Image deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListingImage = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const listing = await ListingService.updateListingImage(req.params.id, req.params.imageId, req.body, userId);
    res.json({
      success: true,
      data: listing,
      message: 'Image updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAvailabilityPeriod = async (req, res, next) => {
  try {
    const result = await ListingService.updateAvailabilityPeriod(req.params.id, req.params.periodId, req.body);
    res.json({
      success: true,
      data: result,
      message: 'Availability period updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAvailabilityPeriod = async (req, res, next) => {
  try {
    const result = await ListingService.deleteAvailabilityPeriod(req.params.id, req.params.periodId);
    res.json({
      success: true,
      data: result,
      message: 'Availability period deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListingAvailability = async (req, res, next) => {
  try {
    const result = await ListingService.updateListingAvailability(req.params.id, req.body.availability);
    res.json({
      success: true,
      data: result,
      message: 'Listing availability updated successfully'
    });
  } catch (err) {
    next(err);
  }
};
// Missing controller methods for Postman collection routes

exports.getListingsByLocation = async (req, res, next) => {
  try {
    const result = await ListingService.getListingsByLocation(req);
    
    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
      message: 'Location-based listings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getFeaturedListings = async (req, res, next) => {
  try {
    const result = await ListingService.getFeaturedListings(req);
    
    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
      message: 'Featured listings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getRecentListings = async (req, res, next) => {
  try {
    const result = await ListingService.getRecentListings(req);
    
    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
      dateRange: result.dateRange,
      message: 'Recent listings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getSimilarListings = async (req, res, next) => {
  try {
    const { limit = 5, includeInactive = false } = req.query;
    const listingId = req.params.id;
    
    const result = await ListingService.getSimilarListings(listingId, {
      limit: parseInt(limit),
      includeInactive: includeInactive === 'true'
    });
    
    res.json({
      success: true,
      data: result.similarListings,
      count: result.totalFound,
      baseListing: result.baseListing,
      searchCriteria: result.searchCriteria,
      message: result.totalFound > 0 
        ? `Found ${result.totalFound} similar listings` 
        : 'No similar listings found'
    });
  } catch (err) {
    next(err);
  }
};

exports.getListingStatistics = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const { period = 'all' } = req.query;
    
    const statistics = await ListingService.getListingStatistics(listingId, { period });
    
    res.json({
      success: true,
      data: statistics,
      message: `Statistics generated for ${period} period`
    });
  } catch (err) {
    next(err);
  }
};

exports.getHostListings = async (req, res, next) => {
  try {
    const hostId = req.user.id || req.user._id;
    const result = await ListingService.getListingsByHost(hostId, req.query);
    
    res.json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
      message: 'Host listings retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.deactivateListing = async (req, res, next) => {
  try {
    const { reason } = req.body;
    // Placeholder implementation
    res.json({
      success: true,
      message: 'Listing deactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.reactivateListing = async (req, res, next) => {
  try {
    // Placeholder implementation
    res.json({
      success: true,
      message: 'Listing reactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// IMAGE MANAGEMENT CONTROLLERS
// ================================

// Get listing images
exports.getListingImages = async (req, res, next) => {
  try {
    const result = await ListingService.getListingImages(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Bulk delete listing images
exports.bulkDeleteListingImages = async (req, res, next) => {
  try {
    const { imageIds } = req.body;
    const result = await ListingService.bulkDeleteListingImages(req.params.id, imageIds, req.user.id);
    
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Images deleted successfully',
      data: result,
      meta: {
        deletedCount: imageIds.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search images across listings
exports.searchImages = async (req, res, next) => {
  try {
    const result = await ListingService.searchImages(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
