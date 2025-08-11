const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  // Human-readable listing ID
  listingId: { 
    type: String, 
    unique: true, 
    index: true 
  },
  
  // Core listing information
  title: { type: String, required: true },
  description: { type: String, required: true },
  listingType: { type: String, enum: ['Home', 'Experience', 'Service'], required: true },
  category: { type: String }, // Unified category field for all types
  
  // Location information
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  zipcode: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  
  // Pricing and host
  price: { type: Number, required: true },
  salePrice: { type: Number }, // Discounted price if applicable
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Common timing fields (applicable to all types)
  duration: { type: String }, // e.g., "2 hours", "3 days", "1 week"
  startTime: { type: String }, // e.g., "9:00 AM"
  endTime: { type: String }, // e.g., "5:00 PM"
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Common capacity fields
  maxGuests: { type: Number }, // Unified guest/group size field
  minGuests: { type: Number, default: 1 },
  
  // Language and provider info
  languages: [{ type: String }], // Applicable to experiences and services
  provider: { type: String }, // Service provider name or experience host bio
  
  // Content arrays (unified)
  includes: [{ type: String }], // What's included in the listing
  highlights: [{ type: String }], // Key highlights
  requirements: [{ type: String }], // Requirements for guests/participants
  rules: { type: String }, // House rules, safety guidelines, etc.
  
  // Home-specific fields (only for Home type)
  homeDetails: {
    bedrooms: { type: Number },
    beds: { type: Number },
    bathrooms: { type: Number },
    roomType: { 
      type: String, 
      enum: ['Entire place', 'Private room', 'Shared room'] 
    },
    propertyType: { 
      type: String,
      enum: ['House', 'Apartment', 'Condo', 'Villa', 'Cabin', 'Other']
    }
  },
  
  // Experience-specific fields (only for Experience type)
  experienceDetails: {
    skillLevel: { 
      type: String, 
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All levels'] 
    },
    ageRestriction: { 
      type: String,
      enum: ['All ages', '18+', '21+', 'Custom']
    },
    customAgeRequirement: { type: String }, // If ageRestriction is 'Custom'
    physicalRequirements: { type: String },
    weatherDependency: { type: Boolean, default: false }
  },
  
  // Service-specific fields (only for Service type)
  serviceDetails: {
    serviceType: {
      type: String,
      enum: ['Consultation', 'Installation', 'Maintenance', 'Delivery', 'Other']
    },
    qualification: { type: String }, // Provider qualifications
    equipment: [{ type: String }], // Equipment provided or required
    travelRadius: { type: Number }, // Service area radius in km
    emergencyService: { type: Boolean, default: false }
  },
  
  // Common fields
  
  // Enhanced amenity management - embedded for better form handling
  amenities: {
    included: [{
      key: { type: String, required: true }, // Amenity key for reference
      name: { type: String, required: true }, // Amenity name for display
      category: { type: String, required: true }, // Category for grouping
      icon: { type: String }, // Icon for UI
      notes: { type: String } // Host-specific notes about this amenity
    }],
    excluded: [{
      key: { type: String, required: true },
      name: { type: String, required: true },
      category: { type: String, required: true },
      reason: { type: String } // Why this amenity is excluded
    }],
    // Additional amenities not in the standard list
    custom: [{
      name: { type: String, required: true },
      description: { type: String },
      category: { type: String, default: 'other' }
    }]
  },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  instantBook: { type: Boolean, default: false },
  
  // Pet policy
  petPolicy: {
    petsAllowed: { type: Boolean, default: false },
    petTypes: [{ 
      type: String, 
      enum: ['Dogs', 'Cats', 'Birds', 'Fish', 'Small pets', 'Other'] 
    }], // What types of pets are allowed
    maxPets: { type: Number, default: 0 }, // Maximum number of pets allowed
    petFee: { type: Number, default: 0 }, // Additional fee per pet per night/booking
    petDeposit: { type: Number, default: 0 }, // Refundable pet deposit
    petRules: { type: String }, // Specific rules for pets
    assistanceAnimalsAllowed: { type: Boolean, default: true }, // Service/assistance animals
    petAmenities: [{ type: String }] // Pet-specific amenities like dog bed, food bowls, etc.
  },
  
  // Enhanced search and filtering fields
  searchTags: [{ type: String }], // Keywords for better search (auto-generated and manual)
  accessibility: {
    wheelchairAccessible: { type: Boolean, default: false },
    stepFreeAccess: { type: Boolean, default: false },
    accessibleParking: { type: Boolean, default: false },
    accessibleBathroom: { type: Boolean, default: false },
    accessibilityFeatures: [{ type: String }] // List of accessibility features
  },
  
  // Booking and availability enhancements
  minimumStay: { type: Number, default: 1 }, // Minimum nights for homes, minimum booking for experiences/services
  maximumStay: { type: Number }, // Maximum stay limit
  advanceBooking: { type: Number, default: 365 }, // How far in advance can bookings be made (days)
  cancellationPolicy: {
    type: String,
    enum: ['Flexible', 'Moderate', 'Strict', 'Super Strict'],
    default: 'Moderate'
  },
  
  // Verification and trust
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  responseTime: { type: String }, // Host response time (e.g., "within an hour", "within a day")
  responseRate: { type: Number, min: 0, max: 100 }, // Host response rate percentage
  
  // Availability management
  availability: [
    {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      isAvailable: { type: Boolean, default: true },
      specialPricing: { type: Number } // Override default price for specific dates
    }
  ]
}, { timestamps: true });

listingSchema.index({ location: '2dsphere' });
listingSchema.index({ listingType: 1, isActive: 1 });
listingSchema.index({ host: 1 });
listingSchema.index({ category: 1, listingType: 1 });
listingSchema.index({ 'petPolicy.petsAllowed': 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ maxGuests: 1 });
listingSchema.index({ instantBook: 1 });
listingSchema.index({ verificationStatus: 1 });
listingSchema.index({ isFeatured: 1 });
listingSchema.index({ searchTags: 1 });
listingSchema.index({ city: 1, state: 1, country: 1 });
listingSchema.index({ listingId: 1, isActive: 1 }); // Index for human-readable ID
listingSchema.index({ 'amenities.included.key': 1 }); // Index for amenity filtering
listingSchema.index({ 'amenities.included.category': 1 }); // Index for category filtering
// Compound indexes for common search patterns
listingSchema.index({ listingType: 1, 'petPolicy.petsAllowed': 1, price: 1 });
listingSchema.index({ city: 1, listingType: 1, price: 1 });
listingSchema.index({ location: '2dsphere', listingType: 1, price: 1 });

// Pre-save middleware for conditional validation and search optimization
// Pre-save middleware to generate human-readable listingId
listingSchema.pre('save', async function(next) {
  if (!this.listingId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    // Generate unique 5-digit number
    let isUnique = false;
    let listingId;
    
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
      listingId = `LST-${dateStr}-${randomNum}`;
      
      // Check if this ID already exists
      const existingListing = await this.constructor.findOne({ listingId });
      if (!existingListing) {
        isUnique = true;
      }
    }
    
    this.listingId = listingId;
  }
  next();
});

listingSchema.pre('save', function(next) {
  const listing = this;
  
  // Generate search tags automatically
  const tags = [];
  if (listing.title) tags.push(...listing.title.toLowerCase().split(' '));
  if (listing.description) tags.push(...listing.description.toLowerCase().split(' '));
  if (listing.category) tags.push(listing.category.toLowerCase());
  if (listing.city) tags.push(listing.city.toLowerCase());
  if (listing.state) tags.push(listing.state.toLowerCase());
  if (listing.country) tags.push(listing.country.toLowerCase());
  if (listing.petPolicy?.petsAllowed) tags.push('pet-friendly', 'pets-allowed');
  if (listing.accessibility?.wheelchairAccessible) tags.push('wheelchair-accessible', 'accessible');
  if (listing.instantBook) tags.push('instant-book');
  
  // Add type-specific tags
  if (listing.homeDetails) {
    if (listing.homeDetails.propertyType) tags.push(listing.homeDetails.propertyType.toLowerCase());
    if (listing.homeDetails.roomType) tags.push(listing.homeDetails.roomType.toLowerCase().replace(' ', '-'));
  }
  
  // Remove duplicates and common words
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  listing.searchTags = [...new Set(tags.filter(tag => tag.length > 2 && !commonWords.includes(tag)))];
  
  // Validate based on listing type
  switch (listing.listingType) {
    case 'Home':
      // Ensure home-specific validations
      if (listing.homeDetails && listing.homeDetails.bedrooms < 0) {
        return next(new Error('Bedrooms cannot be negative'));
      }
      // Clear irrelevant fields for homes
      listing.experienceDetails = undefined;
      listing.serviceDetails = undefined;
      break;
      
    case 'Experience':
      // Ensure experience-specific validations
      if (!listing.duration) {
        return next(new Error('Duration is required for experiences'));
      }
      // Clear irrelevant fields for experiences
      listing.homeDetails = undefined;
      listing.serviceDetails = undefined;
      break;
      
    case 'Service':
      // Ensure service-specific validations
      if (!listing.provider) {
        return next(new Error('Provider is required for services'));
      }
      // Clear irrelevant fields for services
      listing.homeDetails = undefined;
      listing.experienceDetails = undefined;
      break;
  }
  
  next();
});

// Instance methods
listingSchema.methods.isAvailableOnDate = function(date) {
  if (!this.availability || this.availability.length === 0) {
    return false;
  }
  
  const targetDate = new Date(date);
  return this.availability.some(slot => {
    return targetDate >= slot.start && 
           targetDate <= slot.end && 
           slot.isAvailable;
  });
};

listingSchema.methods.getEffectivePrice = function(date) {
  if (!date) return this.salePrice || this.price;
  
  const targetDate = new Date(date);
  const specialPricing = this.availability.find(slot => {
    return targetDate >= slot.start && 
           targetDate <= slot.end && 
           slot.specialPricing;
  });
  
  return specialPricing?.specialPricing || this.salePrice || this.price;
};

listingSchema.methods.getTotalPrice = function(startDate, endDate, guests = 1, pets = 0) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Calculate price for each night individually to handle special pricing
  let totalBasePrice = 0;
  let priceBreakdown = [];
  
  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    const nightPrice = this.getEffectivePrice(currentDate);
    totalBasePrice += nightPrice;
    
    // Track breakdown for transparency
    priceBreakdown.push({
      date: currentDate.toISOString().split('T')[0],
      price: nightPrice,
      isSpecialPrice: this.availability?.some(slot => 
        currentDate >= slot.start && 
        currentDate <= slot.end && 
        slot.specialPricing && 
        slot.specialPricing === nightPrice
      ) || false
    });
  }
  
  let totalPrice = totalBasePrice;
  
  // Add pet fees
  const petFee = (pets > 0 && this.petPolicy?.petsAllowed) ? 
    (this.petPolicy.petFee || 0) * pets * nights : 0;
  const petDeposit = (pets > 0 && this.petPolicy?.petsAllowed) ? 
    (this.petPolicy.petDeposit || 0) * pets : 0;
  
  totalPrice += petFee + petDeposit;
  
  // Add cleaning fee (if applicable)
  // Add service fee (platform fee)
  // Add taxes (would be calculated based on location)
  
  return {
    basePrice: totalBasePrice,
    petFee: petFee,
    petDeposit: petDeposit,
    totalPrice: totalPrice,
    nights: nights,
    priceBreakdown: priceBreakdown
  };
};

listingSchema.methods.isPetFriendly = function() {
  return this.petPolicy?.petsAllowed || false;
};

listingSchema.methods.canAccommodatePets = function(petCount, petTypes = []) {
  if (!this.petPolicy?.petsAllowed) return false;
  if (petCount > (this.petPolicy.maxPets || 0)) return false;
  
  // Check if all pet types are allowed
  if (petTypes.length > 0 && this.petPolicy.petTypes) {
    return petTypes.every(type => this.petPolicy.petTypes.includes(type));
  }
  
  return true;
};

listingSchema.methods.getTypeSpecificFields = function() {
  switch (this.listingType) {
    case 'Home':
      return this.homeDetails;
    case 'Experience':
      return this.experienceDetails;
    case 'Service':
      return this.serviceDetails;
    default:
      return null;
  }
};

// Amenity helper methods
listingSchema.methods.hasAmenity = function(amenityKey) {
  return this.amenities?.included?.some(amenity => amenity.key === amenityKey) || false;
};

listingSchema.methods.getAmenitiesByCategory = function(category) {
  if (!this.amenities?.included) return [];
  return this.amenities.included.filter(amenity => amenity.category === category);
};

listingSchema.methods.getAllIncludedAmenities = function() {
  return this.amenities?.included || [];
};

listingSchema.methods.getAllExcludedAmenities = function() {
  return this.amenities?.excluded || [];
};

listingSchema.methods.getCustomAmenities = function() {
  return this.amenities?.custom || [];
};

listingSchema.methods.getAmenityCategories = function() {
  if (!this.amenities?.included) return [];
  const categories = [...new Set(this.amenities.included.map(amenity => amenity.category))];
  return categories;
};

listingSchema.methods.addIncludedAmenity = function(amenityData) {
  if (!this.amenities) this.amenities = { included: [], excluded: [], custom: [] };
  if (!this.amenities.included) this.amenities.included = [];
  
  // Check if amenity already exists
  const exists = this.amenities.included.some(amenity => amenity.key === amenityData.key);
  if (!exists) {
    this.amenities.included.push(amenityData);
  }
};

listingSchema.methods.removeIncludedAmenity = function(amenityKey) {
  if (!this.amenities?.included) return;
  this.amenities.included = this.amenities.included.filter(amenity => amenity.key !== amenityKey);
};

listingSchema.methods.addExcludedAmenity = function(amenityData) {
  if (!this.amenities) this.amenities = { included: [], excluded: [], custom: [] };
  if (!this.amenities.excluded) this.amenities.excluded = [];
  
  const exists = this.amenities.excluded.some(amenity => amenity.key === amenityData.key);
  if (!exists) {
    this.amenities.excluded.push(amenityData);
  }
};

// Static methods
listingSchema.statics.findByType = function(type, filters = {}) {
  return this.find({ listingType: type, isActive: true, ...filters });
};

listingSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000, filters = {}) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    ...filters
  });
};

listingSchema.statics.findPetFriendly = function(filters = {}) {
  return this.find({
    'petPolicy.petsAllowed': true,
    isActive: true,
    ...filters
  });
};

listingSchema.statics.searchListings = function(searchParams) {
  const {
    q, // search query
    listingType,
    category,
    minPrice,
    maxPrice,
    city,
    state,
    country,
    maxGuests,
    minGuests,
    petsAllowed,
    petTypes,
    maxPets,
    accessibility,
    instantBook,
    amenities,
    startDate,
    endDate,
    minimumStay,
    verificationStatus
  } = searchParams;

  // Build base query
  const query = { 
    isActive: true
  };

  // Only add verificationStatus filter if explicitly provided
  if (verificationStatus) {
    query.verificationStatus = verificationStatus;
  }

  // Text search across multiple fields
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { searchTags: { $in: [new RegExp(q, 'i')] } },
      { city: { $regex: q, $options: 'i' } },
      { state: { $regex: q, $options: 'i' } }
    ];
  }

  // Basic filters
  if (listingType) query.listingType = listingType;
  if (category) query.category = { $regex: category, $options: 'i' };
  if (city) query.city = { $regex: city, $options: 'i' };
  if (state) query.state = { $regex: state, $options: 'i' };
  if (country) query.country = { $regex: country, $options: 'i' };
  if (instantBook === 'true' || instantBook === true) query.instantBook = true;

  // Price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Guest capacity
  if (maxGuests) query.maxGuests = { $gte: Number(maxGuests) };
  if (minGuests) query.minGuests = { $lte: Number(minGuests) };

  // Pet filters
  if (petsAllowed === 'true' || petsAllowed === true) {
    query['petPolicy.petsAllowed'] = true;
  }
  if (petTypes && Array.isArray(petTypes)) {
    query['petPolicy.petTypes'] = { $in: petTypes };
  }
  if (maxPets) {
    query['petPolicy.maxPets'] = { $gte: Number(maxPets) };
  }

  // Accessibility filters
  if (accessibility === 'true' || accessibility === true) {
    query['accessibility.wheelchairAccessible'] = true;
  }

  // Amenities filter - now works with embedded structure
  if (amenities) {
    const amenityList = Array.isArray(amenities) ? amenities : amenities.split(',');
    query['amenities.included.key'] = { $in: amenityList };
  }

  // Availability filter
  if (startDate && endDate) {
    query.availability = {
      $elemMatch: {
        start: { $lte: new Date(startDate) },
        end: { $gte: new Date(endDate) },
        isAvailable: true
      }
    };
  }

  // Minimum stay filter
  if (minimumStay) {
    query.minimumStay = { $lte: Number(minimumStay) };
  }

  return this.find(query);
};

listingSchema.virtual('images', {
  ref: 'Image',
  localField: '_id',
  foreignField: 'listing'
});

listingSchema.set('toObject', { virtuals: true });
listingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema); 