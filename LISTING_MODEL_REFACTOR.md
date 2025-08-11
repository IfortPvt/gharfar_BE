# Listing Model Refactor Documentation

## Overview
The Listing model has been refactored to provide a cleaner, more efficient structure that reduces nesting and improves data access patterns while maintaining type-specific functionality.

## Key Improvements

### 1. Flattened Common Fields
Previously nested fields that were common across listing types have been moved to the main schema level:

- **Timing fields**: `duration`, `startTime`, `endTime`, `startDate`, `endDate`
- **Capacity fields**: `maxGuests`, `minGuests` (unified from separate guest/group size fields)
- **Content arrays**: `includes`, `highlights`, `requirements` (unified from type-specific arrays)
- **Provider info**: `languages`, `provider`

### 2. Simplified Type-Specific Nested Objects
The nested objects now only contain fields that are truly unique to each listing type:

#### `homeDetails` (Home listings only)
- `bedrooms`, `beds`, `bathrooms`
- `roomType`, `propertyType`

#### `experienceDetails` (Experience listings only)
- `skillLevel`, `ageRestriction`, `customAgeRequirement`
- `physicalRequirements`, `weatherDependency`

#### `serviceDetails` (Service listings only)
- `serviceType`, `qualification`
- `equipment`, `travelRadius`, `emergencyService`

### 3. Enhanced Validation & Data Integrity
- Pre-save middleware automatically clears irrelevant nested objects based on `listingType`
- Type-specific validation ensures required fields are present
- Automatic cleanup prevents data inconsistencies

### 4. Improved Indexing
Added strategic indexes for better query performance:
- `listingType` + `isActive` compound index
- `category` + `listingType` compound index
- `host` index for host-specific queries

## Usage Examples

### Creating a Home Listing
```javascript
const homeListing = new Listing({
  title: "Cozy Downtown Apartment",
  description: "Beautiful apartment in the heart of the city",
  listingType: "Home",
  category: "Apartment",
  address: "123 Main St",
  city: "New York",
  price: 150,
  host: hostId,
  maxGuests: 4,
  minGuests: 1,
  homeDetails: {
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    roomType: "Entire place",
    propertyType: "Apartment"
  },
  amenities: [amenityIds],
  rules: "No smoking, no parties",
  instantBook: true
});
```

### Creating an Experience Listing
```javascript
const experienceListing = new Listing({
  title: "City Walking Tour",
  description: "Explore the city's hidden gems",
  listingType: "Experience",
  category: "Tours",
  duration: "3 hours",
  startTime: "10:00 AM",
  endTime: "1:00 PM",
  price: 45,
  host: hostId,
  maxGuests: 12,
  minGuests: 2,
  languages: ["English", "Spanish"],
  includes: ["Professional guide", "Local snacks", "Photo stops"],
  highlights: ["Historic landmarks", "Local stories", "Hidden gems"],
  requirements: ["Comfortable walking shoes", "Basic fitness level"],
  experienceDetails: {
    skillLevel: "All levels",
    ageRestriction: "All ages",
    physicalRequirements: "Moderate walking required",
    weatherDependency: true
  }
});
```

### Creating a Service Listing
```javascript
const serviceListing = new Listing({
  title: "Home Cleaning Service",
  description: "Professional residential cleaning",
  listingType: "Service",
  category: "Cleaning",
  duration: "2-4 hours",
  price: 120,
  host: hostId,
  provider: "CleanPro Services",
  maxGuests: 1, // Number of properties/locations
  languages: ["English"],
  includes: ["All cleaning supplies", "Equipment", "Insurance"],
  highlights: ["Eco-friendly products", "Bonded professionals", "Satisfaction guarantee"],
  serviceDetails: {
    serviceType: "Maintenance",
    qualification: "Licensed and insured cleaning professionals",
    equipment: ["Vacuum cleaners", "Cleaning supplies", "Microfiber cloths"],
    travelRadius: 25, // 25km service area
    emergencyService: false
  }
});
```

## Benefits of the New Structure

### 1. **Simplified Data Access**
```javascript
// Old way - nested access with type checking
const duration = listing.listingType === 'Experience' 
  ? listing.experienceFields?.experienceDuration 
  : listing.serviceFields?.serviceDuration;

// New way - direct access
const duration = listing.duration;
```

### 2. **Consistent API Responses**
All listings now have the same top-level structure, making frontend handling much simpler:

```javascript
// Frontend can always access these fields consistently
const { title, description, price, duration, maxGuests, includes } = listing;
```

### 3. **Better Query Performance**
```javascript
// Find all listings with specific duration
const listings = await Listing.find({ 
  duration: "2 hours",
  isActive: true 
});

// Find experiences by skill level
const beginnerExperiences = await Listing.find({
  listingType: "Experience",
  "experienceDetails.skillLevel": "Beginner"
});
```

### 4. **Type-Safe Operations**
```javascript
// Get type-specific fields safely
const typeSpecificData = listing.getTypeSpecificFields();

// Check availability
const isAvailable = listing.isAvailableOnDate(new Date());

// Get effective pricing with date-based overrides
const price = listing.getEffectivePrice(checkInDate);
```

## Migration Considerations

If you have existing data, you'll need to migrate it to the new structure:

1. **Move common fields** from nested objects to top level
2. **Rename fields** where necessary (e.g., `experienceGroupSize` → `maxGuests`)
3. **Clean up redundant fields** (e.g., remove duplicate title fields)
4. **Update application code** to use the new field locations

## Validation Rules

The model now enforces these validation rules automatically:

- **Home listings**: Must clear `experienceDetails` and `serviceDetails`
- **Experience listings**: Must have `duration`, clears other type-specific details
- **Service listings**: Must have `provider`, clears other type-specific details
- **All types**: Negative values for capacity fields are prevented

This refactored structure provides a much cleaner, more maintainable codebase while preserving all the functionality needed for a multi-type listing platform.
