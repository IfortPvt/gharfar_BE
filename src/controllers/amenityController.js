const amenityService = require('../services/amenityService');

// Get all amenities with optional filtering
exports.getAllAmenities = async (req, res, next) => {
  try {
    const { category, listingType, common } = req.query;
    let result;
    
    if (common === 'true') {
      const amenities = await amenityService.getCommonAmenities(listingType);
      result = {
        success: true,
        data: { items: amenities },
        message: 'Common amenities retrieved successfully'
      };
    } else if (category) {
      const amenities = await amenityService.getAmenitiesByCategory(category);
      result = {
        success: true,
        data: { items: amenities },
        message: 'Category amenities retrieved successfully'
      };
    } else {
      result = await amenityService.getAllAmenities(req);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get amenities grouped by category
exports.getAmenitiesGrouped = async (req, res, next) => {
  try {
    const { listingType } = req.query;
    const groupedAmenities = await amenityService.getAmenitiesGroupedByCategory(listingType);
    
    res.json({
      success: true,
      data: groupedAmenities,
      message: 'Grouped amenities retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get amenities by category
exports.getAmenitiesByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const amenities = await amenityService.getAmenitiesByCategory(category);
    
    res.json({
      success: true,
      data: amenities,
      message: `Amenities for category '${category}' retrieved successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Search amenities
exports.searchAmenities = async (req, res, next) => {
  try {
    const { q, category } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const result = await amenityService.searchAmenities(req, q, category);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get amenity by key
exports.getAmenityByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const amenity = await amenityService.getAmenityByKey(key);
    
    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found'
      });
    }
    
    res.json({
      success: true,
      data: amenity,
      message: 'Amenity retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get multiple amenities by keys
exports.getAmenitiesByKeys = async (req, res, next) => {
  try {
    const { keys } = req.body;
    
    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({
        success: false,
        message: 'Keys array is required'
      });
    }
    
    const amenities = await amenityService.getAmenitiesByKeys(keys);
    
    res.json({
      success: true,
      data: amenities,
      message: 'Amenities retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Create new amenity (Admin only)
exports.createAmenity = async (req, res, next) => {
  try {
    const amenity = await amenityService.createAmenity(req.body);
    
    res.status(201).json({
      success: true,
      data: amenity,
      message: 'Amenity created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update amenity (Admin only)
exports.updateAmenity = async (req, res, next) => {
  try {
    const amenity = await amenityService.updateAmenity(req.params.id, req.body);
    
    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found'
      });
    }
    
    res.json({
      success: true,
      data: amenity,
      message: 'Amenity updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete amenity (Admin only) - soft delete
exports.deleteAmenity = async (req, res, next) => {
  try {
    const amenity = await amenityService.deleteAmenity(req.params.id);
    
    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Amenity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Seed default amenities (Admin only)
exports.seedDefaultAmenities = async (req, res, next) => {
  try {
    await amenityService.seedDefaultAmenities();
    
    res.json({
      success: true,
      message: 'Default amenities seeded successfully'
    });
  } catch (error) {
    next(error);
  }
};