const Amenity = require('../models/Amenity');
const BaseService = require('./baseService');

const getAllAmenities = async (req) => {
  try {
    const filters = { 
      isActive: true,
      ...req.query // Allow additional filters from query params
    };

    return BaseService.findWithPagination(
      Amenity,
      filters,
      req,
      [], // No population needed for amenities
      'Amenities retrieved successfully',
      { category: 1, sortOrder: 1, name: 1 }
    );
  } catch (error) {
    throw error;
  }
};

const getAmenitiesByCategory = async (category) => {
  return await Amenity.find({ 
    category, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

const getAmenitiesGroupedByCategory = async (listingType = null) => {
  const query = { isActive: true };
  if (listingType) {
    query.applicableFor = listingType;
  }
  
  const amenities = await Amenity.find(query).sort({ category: 1, sortOrder: 1, name: 1 });
  
  // Group by category
  const grouped = amenities.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {});
  
  return grouped;
};

const getCommonAmenities = async (listingType = null) => {
  const query = { isActive: true, isCommon: true };
  if (listingType) {
    query.applicableFor = listingType;
  }
  
  return await Amenity.find(query).sort({ sortOrder: 1, name: 1 });
};

const getAmenityById = async (id) => {
  return await Amenity.findById(id);
};

const getAmenityByKey = async (key) => {
  return await Amenity.findOne({ key, isActive: true });
};

const createAmenity = async (amenityData) => {
  // Generate key from name if not provided
  if (!amenityData.key) {
    amenityData.key = amenityData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }
  
  const amenity = new Amenity(amenityData);
  return await amenity.save();
};

const updateAmenity = async (id, updateData) => {
  return await Amenity.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteAmenity = async (id) => {
  return await Amenity.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

// Validate amenity keys exist in the database
const validateAmenityKeys = async (amenityKeys) => {
  if (!amenityKeys || !Array.isArray(amenityKeys)) return false;
  
  const amenities = await Amenity.find({
    key: { $in: amenityKeys },
    isActive: true
  });
  
  return amenities.length === amenityKeys.length;
};

// Get amenity details by keys
const getAmenitiesByKeys = async (keys) => {
  return await Amenity.find({
    key: { $in: keys },
    isActive: true
  }).sort({ category: 1, sortOrder: 1, name: 1 });
};

// Search amenities
const searchAmenities = async (req, searchTerm, category = null) => {
  try {
    const filters = {
      isActive: true,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { key: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    if (category) {
      filters.category = category;
    }

    return BaseService.findWithPagination(
      Amenity,
      filters,
      req,
      [], // No population needed for amenities
      'Amenity search results retrieved successfully',
      { category: 1, sortOrder: 1, name: 1 }
    );
  } catch (error) {
    throw error;
  }
};

// Seed default amenities for the platform
const seedDefaultAmenities = async () => {
  const defaultAmenities = [
    // Essentials
    { name: 'WiFi', key: 'wifi', icon: 'wifi-icon', category: 'essentials', isCommon: true, sortOrder: 1 },
    { name: 'Kitchen', key: 'kitchen', icon: 'kitchen-icon', category: 'essentials', isCommon: true, sortOrder: 2 },
    { name: 'Heating', key: 'heating', icon: 'heating-icon', category: 'essentials', isCommon: true, sortOrder: 3 },
    { name: 'Air Conditioning', key: 'air-conditioning', icon: 'ac-icon', category: 'essentials', isCommon: true, sortOrder: 4 },
    { name: 'Hot Water', key: 'hot-water', icon: 'hot-water-icon', category: 'essentials', isCommon: true, sortOrder: 5 },
    
    // Features
    { name: 'Swimming Pool', key: 'swimming-pool', icon: 'pool-icon', category: 'features', sortOrder: 1 },
    { name: 'Gym', key: 'gym', icon: 'gym-icon', category: 'features', sortOrder: 2 },
    { name: 'Balcony', key: 'balcony', icon: 'balcony-icon', category: 'features', sortOrder: 3 },
    { name: 'Garden', key: 'garden', icon: 'garden-icon', category: 'features', sortOrder: 4 },
    
    // Safety
    { name: 'Smoke Alarm', key: 'smoke-alarm', icon: 'smoke-alarm-icon', category: 'safety', isCommon: true, sortOrder: 1 },
    { name: 'First Aid Kit', key: 'first-aid-kit', icon: 'first-aid-icon', category: 'safety', sortOrder: 2 },
    { name: 'Security Cameras', key: 'security-cameras', icon: 'camera-icon', category: 'safety', sortOrder: 3 },
    
    // Accessibility
    { name: 'Wheelchair Accessible', key: 'wheelchair-accessible', icon: 'wheelchair-icon', category: 'accessibility', sortOrder: 1 },
    { name: 'Step-Free Access', key: 'step-free-access', icon: 'step-free-icon', category: 'accessibility', sortOrder: 2 },
    
    // Bathroom
    { name: 'Hair Dryer', key: 'hair-dryer', icon: 'hair-dryer-icon', category: 'bathroom', isCommon: true, sortOrder: 1 },
    { name: 'Toiletries', key: 'toiletries', icon: 'toiletries-icon', category: 'bathroom', sortOrder: 2 },
    
    // Bedroom
    { name: 'Bed Linens', key: 'bed-linens', icon: 'linens-icon', category: 'bedroom', isCommon: true, sortOrder: 1 },
    { name: 'Extra Pillows', key: 'extra-pillows', icon: 'pillow-icon', category: 'bedroom', sortOrder: 2 },
    
    // Entertainment
    { name: 'TV', key: 'tv', icon: 'tv-icon', category: 'entertainment', isCommon: true, sortOrder: 1 },
    { name: 'Sound System', key: 'sound-system', icon: 'sound-icon', category: 'entertainment', sortOrder: 2 },
    
    // Outdoor
    { name: 'Patio', key: 'patio', icon: 'patio-icon', category: 'outdoor', sortOrder: 1 },
    { name: 'BBQ Grill', key: 'bbq-grill', icon: 'bbq-icon', category: 'outdoor', sortOrder: 2 },
    
    // Parking
    { name: 'Free Parking', key: 'free-parking', icon: 'parking-icon', category: 'parking', isCommon: true, sortOrder: 1 },
    { name: 'Garage', key: 'garage', icon: 'garage-icon', category: 'parking', sortOrder: 2 },
    
    // Pet amenities
    { name: 'Pet Bed', key: 'pet-bed', icon: 'pet-bed-icon', category: 'pet', sortOrder: 1 },
    { name: 'Food Bowls', key: 'food-bowls', icon: 'bowl-icon', category: 'pet', sortOrder: 2 }
  ];
  
  for (const amenityData of defaultAmenities) {
    const exists = await Amenity.findOne({ key: amenityData.key });
    if (!exists) {
      await createAmenity(amenityData);
    }
  }
};

module.exports = {
  getAllAmenities,
  getAmenitiesByCategory,
  getAmenitiesGroupedByCategory,
  getCommonAmenities,
  getAmenityById,
  getAmenityByKey,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  validateAmenityKeys,
  getAmenitiesByKeys,
  searchAmenities,
  seedDefaultAmenities
};