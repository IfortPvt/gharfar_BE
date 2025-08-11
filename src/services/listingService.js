const Listing = require('../models/Listing');
const User = require('../models/User');
const amenityService = require('./amenityService');
const imageService = require('./imageService');
const BaseService = require('./baseService');
const mongoose = require('mongoose');
const Image = require('../models/Image');

exports.createListing = async (data, hostId) => {
  try {
    const user = await User.findById(hostId);
    if (!user || user.role === 'guest') {
      const err = new Error('Only hosts, landlords, admins, or content managers can list listings.');
      err.status = 403;
      throw err;
    }

    // Handle amenities - new embedded structure
    let amenitiesData = { included: [], excluded: [], custom: [] };
    
    if (data.amenities) {
      if (typeof data.amenities === 'string') {
        try {
          amenitiesData = JSON.parse(data.amenities);
        } catch (e) {
          // If JSON parsing fails, treat as legacy format
          console.warn('Legacy amenity format detected, please update to new structure');
        }
      } else {
        amenitiesData = data.amenities;
      }
      
      // Validate amenity keys if provided
      if (amenitiesData.included?.length > 0) {
        const includedKeys = amenitiesData.included.map(a => a.key);
        const isValid = await amenityService.validateAmenityKeys(includedKeys);
        if (!isValid) {
          const err = new Error('Some included amenity keys are invalid');
          err.status = 400;
          throw err;
        }
      }
      
      if (amenitiesData.excluded?.length > 0) {
        const excludedKeys = amenitiesData.excluded.map(a => a.key);
        const isValid = await amenityService.validateAmenityKeys(excludedKeys);
        if (!isValid) {
          const err = new Error('Some excluded amenity keys are invalid');
          err.status = 400;
          throw err;
        }
      }
    }

    // Handle images - defer upload until after listing is saved
    const imagesToCreate = Array.isArray(data.images) ? data.images : [];

    // Prepare location
    let location = { type: 'Point', coordinates: [0, 0] };
    if (data.longitude && data.latitude) {
      location.coordinates = [Number(data.longitude), Number(data.latitude)];
    }

    // Structure the data according to new schema
    const listingData = {
      // Core information
      title: data.title,
      description: data.description,
      listingType: data.listingType,
      category: data.category,
      
      // Location
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      zipcode: data.zipcode,
      latitude: data.latitude,
      longitude: data.longitude,
      location,
      
      // Pricing and host
      price: data.price,
      salePrice: data.salePrice,
      host: hostId,
      
      // Common fields
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime,
      startDate: data.startDate,
      endDate: data.endDate,
      maxGuests: data.maxGuests || data.guests, // Handle legacy field
      minGuests: data.minGuests,
      languages: data.languages,
      provider: data.provider,
      includes: data.includes,
      highlights: data.highlights,
      requirements: data.requirements,
      rules: data.rules || data.houseRules, // Handle legacy field
      
      // Type-specific details
      homeDetails: data.listingType === 'Home' ? {
        bedrooms: data.bedrooms || data.homeDetails?.bedrooms,
        beds: data.beds || data.homeDetails?.beds,
        bathrooms: data.bathrooms || data.homeDetails?.bathrooms,
        roomType: data.roomType || data.homeDetails?.roomType,
        propertyType: data.propertyType || data.homeDetails?.propertyType
      } : undefined,
      
      experienceDetails: data.listingType === 'Experience' ? {
        skillLevel: data.skillLevel || data.experienceDetails?.skillLevel,
        ageRestriction: data.ageRestriction || data.experienceDetails?.ageRestriction,
        customAgeRequirement: data.customAgeRequirement || data.experienceDetails?.customAgeRequirement,
        physicalRequirements: data.physicalRequirements || data.experienceDetails?.physicalRequirements,
        weatherDependency: data.weatherDependency || data.experienceDetails?.weatherDependency
      } : undefined,
      
      serviceDetails: data.listingType === 'Service' ? {
        serviceType: data.serviceType || data.serviceDetails?.serviceType,
        qualification: data.qualification || data.serviceDetails?.qualification,
        equipment: data.equipment || data.serviceDetails?.equipment,
        travelRadius: data.travelRadius || data.serviceDetails?.travelRadius,
        emergencyService: data.emergencyService || data.serviceDetails?.emergencyService
      } : undefined,
      
      // Enhanced amenity structure
      amenities: amenitiesData,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured || false,
      instantBook: data.instantBook || false,
      availability: data.availability || []
    };

    const listing = new Listing(listingData);
    await listing.save();

    // After save: upload images if provided and attach to listing
    if (imagesToCreate.length > 0) {
      try {
        const newImageIds = await imageService.uploadImages(listing._id, imagesToCreate);
        if (Array.isArray(newImageIds) && newImageIds.length > 0) {
          listing.images = [...(listing.images || []), ...newImageIds];
          await listing.save();
        }
      } catch (e) {
        console.warn('Image upload during listing creation failed:', e?.message || e);
      }
    }
    
    return await Listing.findById(listing._id)
      .populate('images')
      .populate('host', 'fullName email');
  } catch (error) {
    error.status = error.status || 400;
    throw error;
  }
};

exports.getAllListings = async (req) => {
  try {
    const {
      listingType,
      category,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      isActive,
      isFeatured,
      instantBook,
      verificationStatus,
      search
    } = req.query;

    // Build filter object (explicitly, avoid leaking page/limit/sortBy/etc into Mongo filter)
    const filters = {};

    // Active status: if not provided, include docs with isActive=true or missing (legacy data)
    if (isActive !== undefined) {
      filters.isActive = (isActive === 'true' || isActive === true);
    } else {
      filters.$or = [
        { isActive: true },
        { isActive: { $exists: false } }
      ];
    }

    // Add conditional filters
    if (listingType && listingType !== 'all') filters.listingType = listingType;
    if (category) filters.category = category;
    if (city) filters.city = new RegExp(city, 'i');
    if (state) filters.state = new RegExp(state, 'i');
    if (country) filters.country = new RegExp(country, 'i');
    if (isFeatured !== undefined) filters.isFeatured = (isFeatured === 'true' || isFeatured === true);
    if (instantBook !== undefined) filters.instantBook = (instantBook === 'true' || instantBook === true);
    if (verificationStatus) {
      filters.verificationStatus = verificationStatus;
    } else {
      // Default: show verified or legacy without status
      filters.$and = (filters.$and || []).concat([{ $or: [
        { verificationStatus: 'Verified' },
        { verificationStatus: { $exists: false } }
      ]}]);
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    // Search in title and description
    if (search) {
      filters.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { searchTags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const populateOptions = [
      { path: 'images' },
      { path: 'host', select: 'fullName email isFullyVerified' }
    ];

    return BaseService.findWithPagination(
      Listing, 
      filters, 
      req, 
      populateOptions,
      'Listings retrieved successfully'
    );
  } catch (error) {
    error.status = error.status || 500;
    throw error;
  }
};

exports.getListingById = async (id) => {
  return await Listing.findById(id)
    .populate('images')
    
    .populate('host', 'fullName email');
};

exports.getListingByReadableId = async (listingId) => {
  return await Listing.findOne({ listingId })
    .populate('images')
    
    .populate('host', 'fullName email');
};

exports.getListingsByType = async (req, listingType) => {
  try {
    const filters = {
      listingType,
      isActive: true,
      verificationStatus: 'Verified',
      ...req.query // Allow additional filters from query params
    };

    const populateOptions = [
      { path: 'images' },
      { path: 'host', select: 'fullName email' }
    ];

    return BaseService.findWithPagination(
      Listing,
      filters,
      req,
      populateOptions,
      `${listingType} listings retrieved successfully`
    );
  } catch (error) {
    throw error;
  }
};

exports.updateListing = async (id, updateData) => {
  try {
    // Validate amenities if provided - new structure
    if (updateData.amenities) {
      // Validate included amenities
      if (updateData.amenities.included?.length > 0) {
        const includedKeys = updateData.amenities.included.map(a => a.key);
        const isValid = await amenityService.validateAmenityKeys(includedKeys);
        if (!isValid) {
          throw new Error('Some included amenity keys are invalid');
        }
      }
      
      // Validate excluded amenities
      if (updateData.amenities.excluded?.length > 0) {
        const excludedKeys = updateData.amenities.excluded.map(a => a.key);
        const isValid = await amenityService.validateAmenityKeys(excludedKeys);
        if (!isValid) {
          throw new Error('Some excluded amenity keys are invalid');
        }
      }
    }

    // Prepare location
    let location = undefined;
    if (updateData.longitude && updateData.latitude) {
      location = { type: 'Point', coordinates: [Number(updateData.longitude), Number(updateData.latitude)] };
    }

    // Structure update data according to new schema
    const structuredUpdateData = {
      // Core fields
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.description && { description: updateData.description }),
      ...(updateData.category && { category: updateData.category }),
      
      // Location fields
      ...(updateData.address && { address: updateData.address }),
      ...(updateData.city && { city: updateData.city }),
      ...(updateData.state && { state: updateData.state }),
      ...(updateData.country && { country: updateData.country }),
      ...(updateData.zipcode && { zipcode: updateData.zipcode }),
      ...(updateData.latitude && { latitude: updateData.latitude }),
      ...(updateData.longitude && { longitude: updateData.longitude }),
      ...(location && { location }),
      
      // Pricing
      ...(updateData.price && { price: updateData.price }),
      ...(updateData.salePrice !== undefined && { salePrice: updateData.salePrice }),
      
      // Common fields
      ...(updateData.duration && { duration: updateData.duration }),
      ...(updateData.startTime && { startTime: updateData.startTime }),
      ...(updateData.endTime && { endTime: updateData.endTime }),
      ...(updateData.startDate && { startDate: updateData.startDate }),
      ...(updateData.endDate && { endDate: updateData.endDate }),
      ...(updateData.maxGuests !== undefined && { maxGuests: updateData.maxGuests }),
      ...(updateData.minGuests !== undefined && { minGuests: updateData.minGuests }),
      ...(updateData.languages && { languages: updateData.languages }),
      ...(updateData.provider && { provider: updateData.provider }),
      ...(updateData.includes && { includes: updateData.includes }),
      ...(updateData.highlights && { highlights: updateData.highlights }),
      ...(updateData.requirements && { requirements: updateData.requirements }),
      ...(updateData.rules && { rules: updateData.rules }),
      
      // Status fields
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      ...(updateData.isFeatured !== undefined && { isFeatured: updateData.isFeatured }),
      ...(updateData.instantBook !== undefined && { instantBook: updateData.instantBook }),
      
      // Arrays
      ...(updateData.amenities && { amenities: updateData.amenities }),
      ...(updateData.availability && { availability: updateData.availability })
    };

    // Handle type-specific fields
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.listingType === 'Home' && updateData.homeDetails) {
      structuredUpdateData.homeDetails = {
        ...listing.homeDetails,
        ...updateData.homeDetails
      };
    } else if (listing.listingType === 'Experience' && updateData.experienceDetails) {
      structuredUpdateData.experienceDetails = {
        ...listing.experienceDetails,
        ...updateData.experienceDetails
      };
    } else if (listing.listingType === 'Service' && updateData.serviceDetails) {
      structuredUpdateData.serviceDetails = {
        ...listing.serviceDetails,
        ...updateData.serviceDetails
      };
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      structuredUpdateData,
      { new: true, runValidators: true }
    ).populate('images').populate('host', 'fullName email');

    return updatedListing;
  } catch (error) {
    throw error;
  }
};

exports.updateListingImages = async (listingId, imageData) => {
  const { reorder, mainImageId, featuredImageId, newImages } = imageData;
  if (reorder && reorder.length > 0) {
    await imageService.reorderImages(listingId, reorder);
  }
  if (mainImageId) {
    await imageService.setMainImage(listingId, mainImageId);
  }
  if (featuredImageId) {
    await imageService.setFeaturedImage(listingId, featuredImageId);
  }
  if (newImages && newImages.length > 0) {
    await imageService.createImages(newImages, listingId);
  }
  return await Listing.findById(listingId).populate('images');
};

exports.removeListingImage = async (listingId, imageId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }
  await imageService.deleteImage(imageId);
  listing.images = listing.images.filter(img => img.toString() !== imageId);
  await listing.save();
  return listing.populate('images');
};

exports.updateListingImageOrder = async (imageOrder) => {
  await imageService.updateImagesOrder(imageOrder);
  return { success: true };
};

exports.updateListingImageFlags = async (listingId, imageId, flags) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }
  await imageService.updateImageFlags(listingId, imageId, flags);
  return await Listing.findById(listingId).populate('images');
};

// Replace stub with proper implementation: upload files and attach to listing
exports.addListingImages = async (listingId, files, userId) => {
  const listing = await Listing.findById(listingId).populate('host');
  if (!listing) throw new Error('Listing not found');

  // Optional permission check (owner or admin)
  if (userId) {
    const ownerId = listing.host?._id?.toString?.() || listing.host?.toString?.();
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = ownerId && ownerId === userId.toString();
    if (!isOwner && !isAdmin) throw new Error('Access denied');
  }

  const newImageIds = await imageService.uploadImages(listingId, files || []);
  listing.images = [...(listing.images || []), ...newImageIds];
  await listing.save();

  return await Listing.findById(listingId).populate('images');
};

// Host: get listing images with pagination
exports.getListingImages = async (req) => {
  const listingId = req.params.id;
  const page = parseInt(req.query.page || req.pagination?.page || 1);
  const limit = parseInt(req.query.limit || req.pagination?.limit || 10);
  const skip = (page - 1) * limit;

  const [images, total] = await Promise.all([
    Image.find({ listing: listingId }).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Image.countDocuments({ listing: listingId })
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  return {
    status: 'success',
    statusCode: 200,
    data: images,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// Update single image (flags and metadata)
exports.updateListingImage = async (listingId, imageId, data = {}, userId) => {
  const listing = await Listing.findById(listingId).populate('host');
  if (!listing) throw new Error('Listing not found');

  // permission: owner or admin
  if (userId) {
    const ownerId = listing.host?._id?.toString?.() || listing.host?.toString?.();
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = ownerId && ownerId === userId.toString();
    if (!isOwner && !isAdmin) throw new Error('Access denied');
  }

  const { isFeatured, isMainImage, ...rest } = data || {};
  if (isFeatured || isMainImage) {
    await imageService.updateImageFlags(listingId, imageId, { isFeatured, isMainImage });
  }
  if (Object.keys(rest).length > 0) {
    await Image.findByIdAndUpdate(imageId, rest, { new: true });
  }

  return await Listing.findById(listingId).populate('images');
};

// Delete single image and detach from listing
exports.deleteListingImage = async (listingId, imageId, userId) => {
  const listing = await Listing.findById(listingId).populate('host');
  if (!listing) throw new Error('Listing not found');

  if (userId) {
    const ownerId = listing.host?._id?.toString?.() || listing.host?.toString?.();
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = ownerId && ownerId === userId.toString();
    if (!isOwner && !isAdmin) throw new Error('Access denied');
  }

  await imageService.deleteImage(imageId);
  listing.images = (listing.images || []).filter(img => img.toString() !== imageId.toString());
  await listing.save();
  return await Listing.findById(listingId).populate('images');
};

// Admin: list images with filters
exports.getListingImagesAdmin = async (req) => {
  const listingId = req.params.id || req.query.listingId;
  const { isFeatured, isMainImage } = req.query;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (listingId) filter.listing = listingId;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true' || isFeatured === true;
  if (isMainImage !== undefined) filter.isMainImage = isMainImage === 'true' || isMainImage === true;

  const [images, total] = await Promise.all([
    Image.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Image.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  return {
    status: 'success',
    statusCode: 200,
    data: images,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// Admin/Host: bulk delete images
exports.bulkDeleteListingImages = async (listingId, imageIds = [], userId) => {
  const listing = await Listing.findById(listingId).populate('host');
  if (!listing) throw new Error('Listing not found');

  if (userId) {
    const ownerId = listing.host?._id?.toString?.() || listing.host?.toString?.();
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = ownerId && ownerId === userId.toString();
    if (!isOwner && !isAdmin) throw new Error('Access denied');
  }

  await Promise.all((imageIds || []).map(id => imageService.deleteImage(id)));
  listing.images = (listing.images || []).filter(img => !imageIds.includes(img.toString()));
  await listing.save();

  return await Listing.findById(listingId).populate('images');
};

// Admin: upload images helper used by admin controller
exports.uploadListingImages = async ({ listingId, userId, files }) => {
  const listing = await Listing.findById(listingId).populate('host');
  if (!listing) throw new Error('Listing not found');

  // admin assumed authorized by route guard; still allow owner
  if (userId) {
    const ownerId = listing.host?._id?.toString?.() || listing.host?.toString?.();
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = ownerId && ownerId === userId.toString();
    if (!isOwner && !isAdmin) throw new Error('Access denied');
  }

  const newImageIds = await imageService.uploadImages(listingId, files || []);
  listing.images = [...(listing.images || []), ...newImageIds];
  await listing.save();

  return await Listing.findById(listingId).populate('images');
};

// Admin: force set featured/main image
exports.forceSetFeaturedImage = async (listingId, imageId, { isFeatured, isMainImage } = {}, userId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error('Listing not found');
  // Authorization handled by route; still ensure user exists
  if (userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('Unauthorized');
  }
  await imageService.updateImageFlags(listingId, imageId, { isFeatured, isMainImage });
  return await Listing.findById(listingId).populate('images');
};

// Admin: update image status/notes (best-effort; fields may be optional in schema)
exports.updateImageStatus = async (listingId, imageId, { status, adminNotes, reviewComments } = {}, userId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error('Listing not found');
  if (userId) {
    const user = await User.findById(userId).lean();
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    if (!isAdmin) throw new Error('Access denied');
  }
  await Image.findByIdAndUpdate(imageId, { status, adminNotes, reviewComments }, { new: true });
  return await Listing.findById(listingId).populate('images');
};

// Enhanced search functionality
exports.searchListings = async (req) => {
  try {
    const {
      q, // search query
      location, // common search term that maps to city/state
      listingType,
      category,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      maxGuests,
      minGuests,
      amenities,
      skillLevel, // for experiences
      serviceType, // for services
      roomType, // for homes
      propertyType, // for homes
      instantBook,
      // Pet-related filters (with aliases)
      petsAllowed,
      petFriendly, // alias for petsAllowed
      petTypes,
      maxPets,
      // Accessibility filters
      accessibility,
      // Date filters
      checkIn, // alias for startDate
      checkOut, // alias for endDate
      startDate,
      endDate,
      minimumStay,
      verificationStatus, // Don't set default here, let model handle it
      // Location-based search
      latitude,
      longitude,
      radius
    } = req.query;

    // Handle common parameter aliases and mappings
    const processedParams = {
      q: q || location, // Use location as search query if no q provided
      listingType,
      category,
      minPrice,
      maxPrice,
      city: city || (location && !latitude && !longitude ? location : undefined),
      state,
      country,
      maxGuests,
      minGuests,
      petsAllowed: petsAllowed || petFriendly, // Handle petFriendly alias
      petTypes,
      maxPets,
      accessibility,
      instantBook,
      amenities,
      startDate: startDate || checkIn, // Handle checkIn alias
      endDate: endDate || checkOut, // Handle checkOut alias
      minimumStay,
      verificationStatus: verificationStatus || 'Verified' // Keep as 'Verified' for public search
    };

    // Build complex filters using aggregation pipeline
    const pipeline = [];

    // Start with searchListings model method logic (converted to aggregation)
    let baseFilters = {
      isActive: true,
      verificationStatus: processedParams.verificationStatus
    };

    if (processedParams.listingType) baseFilters.listingType = processedParams.listingType;
    if (processedParams.category) baseFilters.category = processedParams.category;
    if (processedParams.instantBook !== undefined) baseFilters.instantBook = processedParams.instantBook === 'true';

    // Price filters
    if (processedParams.minPrice || processedParams.maxPrice) {
      baseFilters.price = {};
      if (processedParams.minPrice) baseFilters.price.$gte = Number(processedParams.minPrice);
      if (processedParams.maxPrice) baseFilters.price.$lte = Number(processedParams.maxPrice);
    }

    // Guest filters
    if (processedParams.minGuests) baseFilters.maxGuests = { $gte: Number(processedParams.minGuests) };
    if (processedParams.maxGuests) baseFilters.maxGuests = { ...baseFilters.maxGuests, $lte: Number(processedParams.maxGuests) };

    // Location filters
    if (processedParams.city) baseFilters.city = new RegExp(processedParams.city, 'i');
    if (processedParams.state) baseFilters.state = new RegExp(processedParams.state, 'i');
    if (processedParams.country) baseFilters.country = new RegExp(processedParams.country, 'i');

    // Search text
    if (processedParams.q) {
      baseFilters.$or = [
        { title: new RegExp(processedParams.q, 'i') },
        { description: new RegExp(processedParams.q, 'i') },
        { searchTags: { $in: [new RegExp(processedParams.q, 'i')] } }
      ];
    }

    pipeline.push({ $match: baseFilters });

    // Type-specific filters
    if (skillLevel && processedParams.listingType === 'Experience') {
      pipeline.push({ $match: { 'experienceDetails.skillLevel': skillLevel } });
    }

    if (serviceType && processedParams.listingType === 'Service') {
      pipeline.push({ $match: { 'serviceDetails.serviceType': serviceType } });
    }

    if ((roomType || propertyType) && processedParams.listingType === 'Home') {
      const typeFilters = {};
      if (roomType) typeFilters['homeDetails.roomType'] = roomType;
      if (propertyType) typeFilters['homeDetails.propertyType'] = propertyType;
      pipeline.push({ $match: typeFilters });
    }

    // Geospatial search
    if (latitude && longitude && radius) {
      const radiusInMeters = Number(radius) * 1000; // Convert km to meters
      pipeline.push({
        $match: {
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
              $maxDistance: radiusInMeters
            }
          }
        }
      });
    }

    // Pet filters
    if (processedParams.petsAllowed === 'true') {
      pipeline.push({ $match: { 'petPolicy.petsAllowed': true } });
    }

    if (processedParams.petTypes) {
      const types = Array.isArray(processedParams.petTypes) ? processedParams.petTypes : [processedParams.petTypes];
      pipeline.push({ $match: { 'petPolicy.allowedPetTypes': { $in: types } } });
    }

    if (processedParams.maxPets) {
      pipeline.push({ $match: { 'petPolicy.maxPets': { $gte: Number(processedParams.maxPets) } } });
    }

    // Accessibility filters
    if (processedParams.accessibility) {
      const accessibilityFeatures = Array.isArray(processedParams.accessibility) ? processedParams.accessibility : [processedParams.accessibility];
      pipeline.push({ $match: { accessibilityFeatures: { $in: accessibilityFeatures } } });
    }

    // Amenity filters
    if (processedParams.amenities) {
      const amenityIds = Array.isArray(processedParams.amenities) ? processedParams.amenities : [processedParams.amenities];
      pipeline.push({ $match: { amenities: { $in: amenityIds } } });
    }

    // Date availability filters (if dates provided)
    if (processedParams.startDate && processedParams.endDate) {
      pipeline.push({
        $match: {
          $and: [
            { 'availability.startDate': { $lte: new Date(processedParams.startDate) } },
            { 'availability.endDate': { $gte: new Date(processedParams.endDate) } }
          ]
        }
      });
    }

    // Minimum stay filter
    if (processedParams.minimumStay) {
      pipeline.push({ $match: { minimumStay: { $lte: Number(processedParams.minimumStay) } } });
    }

    const populateOptions = [
      { path: 'images' },
      { path: 'amenities', select: 'name icon' },
      { path: 'host', select: 'fullName email profileImage rating' }
    ];

    return BaseService.aggregateWithPagination(
      Listing,
      pipeline,
      req,
      populateOptions,
      'Search results retrieved successfully'
    );

  } catch (error) {
    throw error;
  }
};

exports.getNearbyListings = async (req, latitude, longitude, maxDistance = 10000) => {
  try {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(maxDistance);

    if (!lat || !lng) {
      throw new Error('Invalid latitude or longitude');
    }

    const { listingType, minPrice, maxPrice, category } = req.query || {};

    // Build aggregation pipeline with geospatial search
    const pipeline = [];

    // Geospatial match stage
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        key: 'location',
        distanceField: 'distance',
        maxDistance: radius * 1000, // Convert km to meters
        spherical: true,
        query: {
          isActive: true,
          verificationStatus: 'Verified' // Only show verified listings in public search
        }
      }
    });

    // Additional filters
    const additionalFilters = {};
    if (listingType) additionalFilters.listingType = listingType;
    if (category) additionalFilters.category = { $regex: category, $options: 'i' };
    
    if (minPrice || maxPrice) {
      additionalFilters.price = {};
      if (minPrice) additionalFilters.price.$gte = Number(minPrice);
      if (maxPrice) additionalFilters.price.$lte = Number(maxPrice);
    }

    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    // Add distance in kilometers
    pipeline.push({
      $addFields: {
        distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] }
      }
    });

    const populateOptions = [
      { path: 'images' },
      { path: 'host', select: 'fullName email profileImage rating' }
    ];

    return BaseService.aggregateWithPagination(
      Listing,
      pipeline,
      req,
      populateOptions,
      'Nearby listings retrieved successfully'
    );
  } catch (error) {
    throw error;
  }
};

// Pet-friendly listings search
exports.getPetFriendlyListings = async (req) => {
  try {
    const {
      petType,
      petTypes,
      maxPets,
      city,
      state,
      country,
      minPrice,
      maxPrice
    } = req.query;

    let filters = { 
      'petPolicy.petsAllowed': true,
      isActive: true,
      verificationStatus: 'Verified'
    };

    // Handle pet type filters (support both singular and plural)
    if (petType) {
      // Single pet type
      filters['petPolicy.petTypes'] = { $in: [petType] };
    } else if (petTypes) {
      // Multiple pet types (array or comma-separated string)
      const typesArray = Array.isArray(petTypes) ? petTypes : petTypes.split(',').map(t => t.trim());
      filters['petPolicy.petTypes'] = { $in: typesArray };
    }

    if (maxPets) {
      filters['petPolicy.maxPets'] = { $gte: Number(maxPets) };
    }

    // Location filters
    if (city) filters.city = { $regex: city, $options: 'i' };
    if (state) filters.state = { $regex: state, $options: 'i' };
    if (country) filters.country = { $regex: country, $options: 'i' };

    // Price filters
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    const populateOptions = [
      { path: 'images' },
      { path: 'amenities', select: 'name icon' },
      { path: 'host', select: 'fullName email profileImage rating' }
    ];

    return BaseService.findWithPagination(
      Listing,
      filters,
      req,
      populateOptions,
      'Pet-friendly listings retrieved successfully',
      { 'petPolicy.petFee': 1, createdAt: -1 } // Sort by pet fee, then newest
    );
  } catch (error) {
    throw error;
  }
};

// Get accessibility-friendly listings
exports.getAccessibilityFriendlyListings = async (req) => {
  try {
    const {
      city,
      state,
      country,
      minPrice,
      maxPrice,
      features
    } = req.query;

    let filters = {
      isActive: true,
      verificationStatus: 'Verified'
    };

    // Handle accessibility features
    if (features) {
      const featureArray = features.split(',').map(f => f.trim());
      const accessibilityQueries = [];

      featureArray.forEach(feature => {
        switch(feature) {
          case 'wheelchairAccessible':
            accessibilityQueries.push({ 'accessibility.wheelchairAccessible': true });
            break;
          case 'stepFreeAccess':
            accessibilityQueries.push({ 'accessibility.stepFreeAccess': true });
            break;
          case 'accessibleParking':
            accessibilityQueries.push({ 'accessibility.accessibleParking': true });
            break;
          case 'accessibleBathroom':
            accessibilityQueries.push({ 'accessibility.accessibleBathroom': true });
            break;
        }
      });

      if (accessibilityQueries.length > 0) {
        filters.$or = accessibilityQueries;
      }
    } else {
      // Default: show any accessibility features
      filters.$or = [
        { 'accessibility.wheelchairAccessible': true },
        { 'accessibility.stepFreeAccess': true },
        { 'accessibility.accessibleParking': true },
        { 'accessibility.accessibleBathroom': true }
      ];
    }

    // Location filters
    if (city) filters.city = { $regex: city, $options: 'i' };
    if (state) filters.state = { $regex: state, $options: 'i' };
    if (country) filters.country = { $regex: country, $options: 'i' };

    // Price filters
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    const populateOptions = [
      { path: 'images' },
      { path: 'amenities', select: 'name icon' },
      { path: 'host', select: 'fullName email profileImage rating' }
    ];

    return BaseService.findWithPagination(
      Listing,
      filters,
      req,
      populateOptions,
      'Accessibility-friendly listings retrieved successfully'
    );
  } catch (error) {
    throw error;
  }
};

// Get listings by location
exports.getListingsByLocation = async (req) => {
  try {
    const {
      city,
      state,
      country,
      radius = 10,
      lat,
      lng,
      minPrice,
      maxPrice,
      listingType
    } = req.query;

    let filters = {
      isActive: true,
      verificationStatus: 'Verified'
    };

    // Location-based filters
    let addressRegex = [];
    
    if (city) {
      addressRegex.push(city);
    }
    
    if (state) {
      addressRegex.push(state);
    }
    
    if (country) {
      addressRegex.push(country);
    }
    
    if (addressRegex.length > 0) {
      // Create a combined regex pattern that matches any of the location terms
      const regexPattern = addressRegex.join('|');
      filters.address = { $regex: regexPattern, $options: 'i' };
    }

    // Additional filters
    if (listingType) {
      filters.listingType = listingType;
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    // If coordinates provided, use geospatial aggregation
    if (lat && lng) {
      const pipeline = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            key: 'location',
            distanceField: 'distance',
            maxDistance: Number(radius) * 1000, // Convert km to meters
            spherical: true,
            query: filters
          }
        },
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] }
          }
        }
      ];

      const populateOptions = [
        { path: 'host', select: 'fullName email profileImage rating' },
        { path: 'amenities.included', select: 'name icon category' }
      ];

      return BaseService.aggregateWithPagination(
        Listing,
        pipeline,
        req,
        populateOptions,
        'Listings by location retrieved successfully'
      );
    } else {
      // Regular query without geospatial search
      const populateOptions = [
        { path: 'host', select: 'fullName email profileImage rating' },
        { path: 'amenities.included', select: 'name icon category' }
      ];

      return BaseService.findWithPagination(
        Listing,
        filters,
        req,
        populateOptions,
        'Listings by location retrieved successfully'
      );
    }
  } catch (error) {
    throw error;
  }
};

// Get featured listings
exports.getFeaturedListings = async (req) => {
  try {
    const {
      listingType,
      minPrice,
      maxPrice
    } = req.query;

    let filters = {
      isFeatured: true,
      isActive: true,
      verificationStatus: 'Verified'
    };

    // Additional filters
    if (listingType) {
      filters.listingType = listingType;
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    const populateOptions = [
      { path: 'host', select: 'fullName email profileImage rating' },
      { path: 'amenities.included', select: 'name icon category' }
    ];

    return BaseService.findWithPagination(
      Listing,
      filters,
      req,
      populateOptions,
      'Featured listings retrieved successfully',
      { updatedAt: -1, createdAt: -1 } // Most recently updated featured listings first
    );
  } catch (error) {
    throw error;
  }
};

// Get recent listings
exports.getRecentListings = async (req) => {
  try {
    const {
      days = 7,
      listingType,
      minPrice,
      maxPrice
    } = req.query;

    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - Number(days));

    let filters = {
      createdAt: { $gte: dateThreshold },
      isActive: true,
      verificationStatus: 'Verified'
    };

    // Additional filters
    if (listingType) {
      filters.listingType = listingType;
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    const populateOptions = [
      { path: 'host', select: 'fullName email profileImage rating' },
      { path: 'amenities.included', select: 'name icon category' }
    ];

    const result = await BaseService.findWithPagination(
      Listing,
      filters,
      req,
      populateOptions,
      'Recent listings retrieved successfully',
      { createdAt: -1 }
    );

    // Expose date range info at top-level for controllers
    const dateRange = {
      from: dateThreshold.toISOString(),
      to: new Date().toISOString(),
      days: Number(days)
    };

    return { ...result, dateRange };
  } catch (error) {
    throw error;
  }
};

// Calculate total price including pet fees
exports.calculateTotalPrice = async (listingId, checkIn, checkOut, guests = 1, pets = 0, petType = '') => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Validate guest count
    if (guests > listing.maxGuests) {
      throw new Error(`Maximum ${listing.maxGuests} guests allowed for this listing`);
    }
    if (guests < listing.minGuests) {
      throw new Error(`Minimum ${listing.minGuests} guests required for this listing`);
    }

    // Validate pet policy if pets are included
    if (pets > 0) {
      if (!listing.petPolicy?.petsAllowed) {
        throw new Error('Pets are not allowed at this listing');
      }
      
      if (pets > (listing.petPolicy.maxPets || 0)) {
        throw new Error(`Maximum ${listing.petPolicy.maxPets} pets allowed`);
      }

      // Validate pet type if specified
      if (petType && listing.petPolicy.petTypes && listing.petPolicy.petTypes.length > 0) {
        const allowedTypes = listing.petPolicy.petTypes.map(type => type.toLowerCase());
        if (!allowedTypes.includes(petType.toLowerCase())) {
          throw new Error(`Pet type "${petType}" is not allowed. Allowed types: ${listing.petPolicy.petTypes.join(', ')}`);
        }
      }
    }

    // Calculate pricing using the model method
    const pricing = listing.getTotalPrice(checkIn, checkOut, guests, pets);
    
    // Add additional details
    return {
      ...pricing,
      listingInfo: {
        id: listing._id,
        title: listing.title,
        price: listing.price,
        salePrice: listing.salePrice
      },
      guestInfo: {
        guests,
        maxGuests: listing.maxGuests,
        minGuests: listing.minGuests
      },
      petInfo: {
        pets,
        petType: petType || null,
        petsAllowed: listing.petPolicy?.petsAllowed || false,
        maxPets: listing.petPolicy?.maxPets || 0,
        petFeePerNight: listing.petPolicy?.petFee || 0,
        petDeposit: listing.petPolicy?.petDeposit || 0,
        allowedPetTypes: listing.petPolicy?.petTypes || []
      },
      dates: {
        checkIn,
        checkOut,
        nights: pricing.nights
      }
    };
  } catch (error) {
    throw error;
  }
};

exports.getListingAmenities = async (listingId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    return listing.amenities;
  } catch (error) {
    throw error;
  }
};

exports.updateListingAmenities = async (listingId, amenities) => {
  try {
    const isValid = await amenityService.validateAmenityIds(amenities);
    if (!isValid) {
      throw new Error('Invalid amenity IDs provided');
    }

    const listing = await Listing.findByIdAndUpdate(
      listingId,
      { amenities },
      { new: true }
    ).populate('images').populate('host', 'fullName email');

    if (!listing) {
      throw new Error('Listing not found');
    }

    return listing;
  } catch (error) {
    throw error;
  }
};

// Helper method to check availability
exports.checkAvailability = async (listingId, checkIn, checkOut, guests = 1) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate guest count
    const numGuests = parseInt(guests);
    if (numGuests > listing.maxGuests) {
      return { 
        available: false, 
        message: `Maximum ${listing.maxGuests} guests allowed for this listing`
      };
    }
    if (numGuests < listing.minGuests) {
      return { 
        available: false, 
        message: `Minimum ${listing.minGuests} guests required for this listing`
      };
    }

    // Check if listing has availability defined
    if (!listing.availability || listing.availability.length === 0) {
      return { available: false, message: 'No availability defined' };
    }

    // Check if requested dates overlap with available periods
    const isAvailable = listing.availability.some(period => {
      return checkInDate >= period.start && 
             checkOutDate <= period.end && 
             period.isAvailable;
    });

    // Calculate number of nights
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    return { 
      available: isAvailable, 
      effectivePrice: listing.getEffectivePrice(checkIn),
      totalNights: nights,
      guests: numGuests,
      message: isAvailable ? 'Available for booking' : 'Not available for selected dates'
    };
  } catch (error) {
    throw error;
  }
};

// Availability Management Functions

// Get listing availability
exports.getListingAvailability = async (listingId) => {
  try {
    const listing = await Listing.findById(listingId).select('availability title');
    if (!listing) {
      throw new Error('Listing not found');
    }

    return {
      listingId: listing._id,
      title: listing.title,
      availability: listing.availability || []
    };
  } catch (error) {
    throw error;
  }
};

// Add new availability period
exports.addAvailabilityPeriod = async (listingId, availabilityData) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Validate dates
    const startDate = new Date(availabilityData.start);
    const endDate = new Date(availabilityData.end);
    
    if (startDate >= endDate) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping periods
    const hasOverlap = listing.availability.some(period => {
      const periodStart = new Date(period.start);
      const periodEnd = new Date(period.end);
      
      return (startDate < periodEnd && endDate > periodStart);
    });

    if (hasOverlap) {
      throw new Error('Availability period overlaps with existing period');
    }

    // Create new availability period
    const newPeriod = {
      start: startDate,
      end: endDate,
      isAvailable: availabilityData.isAvailable !== false, // Default to true
      ...(availabilityData.specialPricing && { specialPricing: Number(availabilityData.specialPricing) })
    };

    listing.availability.push(newPeriod);
    await listing.save();

    return {
      success: true,
      message: 'Availability period added successfully',
      availability: listing.availability
    };
  } catch (error) {
    throw error;
  }
};

// Update existing availability period
exports.updateAvailabilityPeriod = async (listingId, periodId, updateData) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const periodIndex = listing.availability.findIndex(
      period => period._id.toString() === periodId
    );

    if (periodIndex === -1) {
      throw new Error('Availability period not found');
    }

    // Validate dates if provided
    if (updateData.start || updateData.end) {
      const startDate = new Date(updateData.start || listing.availability[periodIndex].start);
      const endDate = new Date(updateData.end || listing.availability[periodIndex].end);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Check for overlapping with other periods (excluding current one)
      const hasOverlap = listing.availability.some((period, index) => {
        if (index === periodIndex) return false; // Skip current period
        
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        
        return (startDate < periodEnd && endDate > periodStart);
      });

      if (hasOverlap) {
        throw new Error('Updated period would overlap with existing period');
      }
    }

    // Update the period
    if (updateData.start) listing.availability[periodIndex].start = new Date(updateData.start);
    if (updateData.end) listing.availability[periodIndex].end = new Date(updateData.end);
    if (updateData.isAvailable !== undefined) listing.availability[periodIndex].isAvailable = updateData.isAvailable;
    if (updateData.specialPricing !== undefined) {
      if (updateData.specialPricing === null) {
        listing.availability[periodIndex].specialPricing = undefined;
      } else {
        listing.availability[periodIndex].specialPricing = Number(updateData.specialPricing);
      }
    }

    await listing.save();

    return {
      success: true,
      message: 'Availability period updated successfully',
      availability: listing.availability
    };
  } catch (error) {
    throw error;
  }
};

// Delete availability period
exports.deleteAvailabilityPeriod = async (listingId, periodId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const initialLength = listing.availability.length;
    listing.availability = listing.availability.filter(
      period => period._id.toString() !== periodId
    );

    if (listing.availability.length === initialLength) {
      throw new Error('Availability period not found');
    }

    await listing.save();

    return {
      success: true,
      message: 'Availability period deleted successfully',
      availability: listing.availability
    };
  } catch (error) {
    throw error;
  }
};

// Bulk update availability (replace all periods)
exports.updateListingAvailability = async (listingId, availabilityData) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Validate all periods
    const processedPeriods = [];
    for (const period of availabilityData) {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Check for overlaps within the new data
      const hasOverlap = processedPeriods.some(processed => {
        return (startDate < processed.end && endDate > processed.start);
      });

      if (hasOverlap) {
        throw new Error('Availability periods cannot overlap');
      }

      processedPeriods.push({
        start: startDate,
        end: endDate,
        isAvailable: period.isAvailable !== false, // Default to true
        ...(period.specialPricing && { specialPricing: Number(period.specialPricing) })
      });
    }

    listing.availability = processedPeriods;
    await listing.save();

    return {
      success: true,
      message: 'Listing availability updated successfully',
      availability: listing.availability
    };
  } catch (error) {
    throw error;
  }
};

// Enhanced amenity management methods
exports.addAmenityToListing = async (listingId, amenityKey, type = 'included', options = {}, userId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    // Check if user owns the listing or is admin
    if (listing.host.toString() !== userId && !['admin', 'superadmin'].includes(user?.role)) {
      throw new Error('Unauthorized');
    }
    
    // Get amenity details
    const amenity = await amenityService.getAmenityByKey(amenityKey);
    if (!amenity) {
      throw new Error('Amenity not found');
    }
    
    // Prepare amenity data
    const amenityData = {
      key: amenityKey,
      name: amenity.name,
      category: amenity.category,
      icon: amenity.icon
    };
    
    if (type === 'included') {
      if (options.notes) amenityData.notes = options.notes;
      listing.addIncludedAmenity(amenityData);
    } else if (type === 'excluded') {
      if (options.reason) amenityData.reason = options.reason;
      listing.addExcludedAmenity(amenityData);
    }
    
    await listing.save();
    return listing;
  } catch (error) {
    throw error;
  }
};

exports.removeAmenityFromListing = async (listingId, amenityKey, type = 'included', userId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    // Check if user owns the listing or is admin
    if (listing.host.toString() !== userId && !['admin', 'superadmin'].includes(user?.role)) {
      throw new Error('Unauthorized');
    }
    
    if (type === 'included') {
      listing.removeIncludedAmenity(amenityKey);
    } else if (type === 'excluded') {
      if (!listing.amenities) listing.amenities = { included: [], excluded: [], custom: [] };
      if (!listing.amenities.excluded) listing.amenities.excluded = [];
      listing.amenities.excluded = listing.amenities.excluded.filter(amenity => amenity.key !== amenityKey);
    }
    
    await listing.save();
    return listing;
  } catch (error) {
    throw error;
  }
};

// Get amenities with detailed information for a listing
exports.getListingAmenitiesDetailed = async (listingId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    const response = {
      included: listing.getAllIncludedAmenities(),
      excluded: listing.getAllExcludedAmenities(),
      custom: listing.getCustomAmenities(),
      categories: listing.getAmenityCategories(),
      summary: {
        totalIncluded: listing.getAllIncludedAmenities().length,
        totalExcluded: listing.getAllExcludedAmenities().length,
        totalCustom: listing.getCustomAmenities().length
      }
    };
    
    return response;
  } catch (error) {
    throw error;
  }
}; 

// Get listings by host
exports.getListingsByHost = async (hostId, options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      listingType = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = { host: hostId };

    // Add status filter
    if (status !== 'all') {
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      } else if (status === 'draft') {
        filter.status = 'draft';
      } else if (status === 'published') {
        filter.status = 'published';
      }
    }

    // Add listing type filter
    if (listingType !== 'all') {
      filter.listingType = listingType;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [listings, totalCount] = await Promise.all([
      Listing.find(filter)
        .populate('amenities', 'name key icon category')
        .populate('host', 'firstName lastName email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return {
      listings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        hasNext: hasNextPage,
        hasPrev: hasPrevPage,
        limit: limitNum
      }
    };
  } catch (error) {
    throw error;
  }
}; 

// Get similar listings based on various criteria
exports.getSimilarListings = async (listingId, options = {}) => {
  try {
    const { limit = 5, includeInactive = false } = options;
    
    // Get the base listing to compare against
    const baseListing = await Listing.findById(listingId);
    if (!baseListing) {
      throw new Error('Listing not found');
    }

    // Calculate price range (±30% of base listing price)
    const priceRange = {
      min: Math.floor(baseListing.price * 0.7),
      max: Math.ceil(baseListing.price * 1.3)
    };

    // Build similarity criteria with weighted scoring
    const pipeline = [
      // Exclude the current listing and inactive listings (unless specified)
      {
        $match: {
          _id: { $ne: baseListing._id },
          ...(includeInactive ? {} : { isActive: true })
        }
      },
      
      // Add similarity score based on multiple factors
      {
        $addFields: {
          similarityScore: {
            $add: [
              // Same listing type (weight: 40)
              { $cond: [{ $eq: ['$listingType', baseListing.listingType] }, 40, 0] },
              
              // Same category (weight: 30)
              { $cond: [{ $eq: ['$category', baseListing.category] }, 30, 0] },
              
              // Price similarity (weight: 15)
              {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$price', priceRange.min] },
                      { $lte: ['$price', priceRange.max] }
                    ]
                  },
                  15,
                  0
                ]
              },
              
              // Same city (weight: 10)
              { $cond: [{ $eq: ['$city', baseListing.city] }, 10, 0] },
              
              // Similar guest capacity (weight: 5)
              {
                $cond: [
                  {
                    $and: [
                      { $lte: ['$minGuests', baseListing.maxGuests] },
                      { $gte: ['$maxGuests', baseListing.minGuests] }
                    ]
                  },
                  5,
                  0
                ]
              }
            ]
          }
        }
      },
      
      // Only include listings with some similarity (score > 0)
      { $match: { similarityScore: { $gt: 0 } } },
      
      // Sort by similarity score (highest first), then by rating, then by price
      {
        $sort: {
          similarityScore: -1,
          'reviews.averageRating': -1,
          price: 1
        }
      },
      
      // Limit results
      { $limit: parseInt(limit) },
      
      // Populate related data
      {
        $lookup: {
          from: 'users',
          localField: 'host',
          foreignField: '_id',
          as: 'host',
          pipeline: [
            { $project: { fullName: 1, email: 1, isFullyVerified: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'images',
          localField: 'images',
          foreignField: '_id',
          as: 'images'
        }
      },
      
      // Unwind host array
      { $unwind: { path: '$host', preserveNullAndEmptyArrays: true } },
      
      // Project final fields
      {
        $project: {
          title: 1,
          description: 1,
          listingType: 1,
          category: 1,
          price: 1,
          salePrice: 1,
          maxGuests: 1,
          minGuests: 1,
          city: 1,
          state: 1,
          country: 1,
          images: 1,
          host: 1,
          reviews: 1,
          isActive: 1,
          isFeatured: 1,
          instantBook: 1,
          verificationStatus: 1,
          listingId: 1,
          similarityScore: 1,
          location: 1
        }
      }
    ];

    const similarListings = await Listing.aggregate(pipeline);

    return {
      baseListing: {
        id: baseListing._id,
        title: baseListing.title,
        listingType: baseListing.listingType,
        category: baseListing.category,
        price: baseListing.price
      },
      similarListings,
      totalFound: similarListings.length,
      searchCriteria: {
        listingType: baseListing.listingType,
        category: baseListing.category,
        priceRange,
        city: baseListing.city,
        guestRange: {
          min: baseListing.minGuests,
          max: baseListing.maxGuests
        }
      }
    };
  } catch (error) {
    throw error;
  }
}; 

// Get comprehensive listing statistics
exports.getListingStatistics = async (listingId, options = {}) => {
  try {
    const { period = 'all' } = options; // 'all', 'month', 'quarter', 'year'
    
    // Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Calculate date range for period filtering
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'month':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear(), now.getMonth(), 1) 
          } 
        };
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFilter = { createdAt: { $gte: quarterStart } };
        break;
      case 'year':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear(), 0, 1) 
          } 
        };
        break;
      default:
        // 'all' - no date filter
        break;
    }

    // Import models for aggregation
    const Booking = require('../models/Booking');
    const Payment = require('../models/Payment');

    // 1. BOOKING STATISTICS
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          listing: listing._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalGuests: { $sum: '$guestCount' },
          totalNights: { $sum: '$totalNights' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // 2. PAYMENT STATISTICS
    const paymentStats = await Payment.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking'
        }
      },
      {
        $unwind: '$booking'
      },
      {
        $match: {
          'booking.listing': listing._id,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransactionAmount: { $avg: '$amount' }
        }
      }
    ]);

    // 3. RATING AND REVIEW STATISTICS
    const reviewStats = await Booking.aggregate([
      {
        $match: {
          listing: listing._id,
          'review.rating': { $exists: true },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$review.rating' },
          fiveStarReviews: {
            $sum: { $cond: [{ $eq: ['$review.rating', 5] }, 1, 0] }
          },
          fourStarReviews: {
            $sum: { $cond: [{ $eq: ['$review.rating', 4] }, 1, 0] }
          },
          threeStarReviews: {
            $sum: { $cond: [{ $eq: ['$review.rating', 3] }, 1, 0] }
          },
          twoStarReviews: {
            $sum: { $cond: [{ $eq: ['$review.rating', 2] }, 1, 0] }
          },
          oneStarReviews: {
            $sum: { $cond: [{ $eq: ['$review.rating', 1] }, 1, 0] }
          }
        }
      }
    ]);

    // 4. MONTHLY TREND ANALYSIS (for charts)
    const monthlyTrends = await Booking.aggregate([
      {
        $match: {
          listing: listing._id,
          createdAt: { 
            $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) 
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          guests: { $sum: '$guestCount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' }
            ]
          },
          bookings: 1,
          revenue: 1,
          guests: 1
        }
      }
    ]);

    // Extract results with defaults
    const bookingData = bookingStats[0] || {};
    const paymentData = paymentStats[0] || {};
    const reviewData = reviewStats[0] || {};

    // 5. CALCULATE PERFORMANCE METRICS
    const totalDaysListed = Math.ceil((now - listing.createdAt) / (1000 * 60 * 60 * 24));
    const occupancyRate = totalDaysListed > 0 
      ? ((bookingData.totalNights || 0) / totalDaysListed * 100).toFixed(2) 
      : 0;

    const conversionRate = listing.views > 0 
      ? ((bookingData.totalBookings || 0) / listing.views * 100).toFixed(2)
      : 0;

    const responseRate = bookingData.totalBookings > 0
      ? ((bookingData.confirmedBookings || 0) / bookingData.totalBookings * 100).toFixed(2)
      : 0;

    // Build comprehensive response
    return {
      listingInfo: {
        id: listing._id,
        title: listing.title,
        listingType: listing.listingType,
        category: listing.category,
        price: listing.price,
        createdAt: listing.createdAt,
        isActive: listing.isActive
      },
      
      bookingStatistics: {
        total: bookingData.totalBookings || 0,
        confirmed: bookingData.confirmedBookings || 0,
        completed: bookingData.completedBookings || 0,
        cancelled: bookingData.cancelledBookings || 0,
        pending: bookingData.pendingBookings || 0,
        totalGuests: bookingData.totalGuests || 0,
        totalNights: bookingData.totalNights || 0,
        averageBookingValue: parseFloat((bookingData.averageBookingValue || 0).toFixed(2))
      },

      revenueStatistics: {
        totalRevenue: parseFloat((bookingData.totalRevenue || 0).toFixed(2)),
        totalPaidAmount: parseFloat((paymentData.totalPaidAmount || 0).toFixed(2)),
        averageTransactionAmount: parseFloat((paymentData.averageTransactionAmount || 0).toFixed(2)),
        totalTransactions: paymentData.totalTransactions || 0
      },

      performanceMetrics: {
        occupancyRate: parseFloat(occupancyRate),
        conversionRate: parseFloat(conversionRate),
        responseRate: parseFloat(responseRate),
        totalDaysListed: totalDaysListed
      },

      reviewStatistics: {
        totalReviews: reviewData.totalReviews || 0,
        averageRating: parseFloat((reviewData.averageRating || 0).toFixed(1)),
        ratingBreakdown: {
          fiveStar: reviewData.fiveStarReviews || 0,
          fourStar: reviewData.fourStarReviews || 0,
          threeStar: reviewData.threeStarReviews || 0,
          twoStar: reviewData.twoStarReviews || 0,
          oneStar: reviewData.oneStarReviews || 0
        }
      },

      monthlyTrends,

      metadata: {
        period,
        generatedAt: new Date(),
        currency: 'USD' // This could be dynamic based on listing
      }
    };

  } catch (error) {
    throw error;
  }
};