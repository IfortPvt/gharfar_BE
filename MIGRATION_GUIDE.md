# Migration Guide for Listing Model Refactor

This guide provides scripts and instructions for migrating existing listing data to the new refactored schema.

## Migration Script

```javascript
// migration-script.js
const mongoose = require('mongoose');
const Listing = require('./src/models/Listing');

async function migrateListing() {
  try {
    console.log('Starting listing migration...');
    
    // Find all listings that need migration
    const listings = await mongoose.connection.collection('listings').find({}).toArray();
    
    console.log(`Found ${listings.length} listings to migrate`);
    
    for (const listing of listings) {
      const updateData = {};
      
      // 1. Handle legacy field mapping
      if (listing.guests && !listing.maxGuests) {
        updateData.maxGuests = listing.guests;
      }
      
      if (listing.houseRules && !listing.rules) {
        updateData.rules = listing.houseRules;
      }
      
      // 2. Flatten experience fields
      if (listing.experienceFields) {
        const expFields = listing.experienceFields;
        
        // Move common fields to top level
        if (expFields.experienceDuration && !listing.duration) {
          updateData.duration = expFields.experienceDuration;
        }
        if (expFields.experienceStartTime && !listing.startTime) {
          updateData.startTime = expFields.experienceStartTime;
        }
        if (expFields.experienceEndTime && !listing.endTime) {
          updateData.endTime = expFields.experienceEndTime;
        }
        if (expFields.experienceGroupSize && !listing.maxGuests) {
          updateData.maxGuests = expFields.experienceGroupSize;
        }
        if (expFields.experienceLanguage && !listing.languages) {
          updateData.languages = [expFields.experienceLanguage];
        }
        if (expFields.experienceIncludes && !listing.includes) {
          updateData.includes = expFields.experienceIncludes;
        }
        if (expFields.experienceHighlights && !listing.highlights) {
          updateData.highlights = expFields.experienceHighlights;
        }
        if (expFields.experienceRequirements && !listing.requirements) {
          updateData.requirements = expFields.experienceRequirements;
        }
        if (expFields.experienceHostBio && !listing.provider) {
          updateData.provider = expFields.experienceHostBio;
        }
        if (expFields.experienceCategory && !listing.category) {
          updateData.category = expFields.experienceCategory;
        }
        
        // Create experienceDetails object
        updateData.experienceDetails = {
          skillLevel: 'All levels', // Default value, update as needed
          ageRestriction: 'All ages', // Default value, update as needed
          weatherDependency: false
        };
        
        // Remove the old nested object
        updateData.$unset = { experienceFields: 1 };
      }
      
      // 3. Flatten service fields
      if (listing.serviceFields) {
        const serviceFields = listing.serviceFields;
        
        // Move common fields to top level
        if (serviceFields.serviceDuration && !listing.duration) {
          updateData.duration = serviceFields.serviceDuration;
        }
        if (serviceFields.serviceStartTime && !listing.startTime) {
          updateData.startTime = serviceFields.serviceStartTime;
        }
        if (serviceFields.serviceEndTime && !listing.endTime) {
          updateData.endTime = serviceFields.serviceEndTime;
        }
        if (serviceFields.serviceProvider && !listing.provider) {
          updateData.provider = serviceFields.serviceProvider;
        }
        if (serviceFields.serviceIncludes && !listing.includes) {
          updateData.includes = serviceFields.serviceIncludes;
        }
        if (serviceFields.serviceHighlights && !listing.highlights) {
          updateData.highlights = serviceFields.serviceHighlights;
        }
        if (serviceFields.serviceCategory && !listing.category) {
          updateData.category = serviceFields.serviceCategory;
        }
        
        // Create serviceDetails object
        updateData.serviceDetails = {
          serviceType: 'Other', // Default value, update as needed
          emergencyService: false
        };
        
        // Remove the old nested object
        if (!updateData.$unset) updateData.$unset = {};
        updateData.$unset.serviceFields = 1;
      }
      
      // 4. Handle home-specific fields
      if (listing.listingType === 'Home') {
        updateData.homeDetails = {
          bedrooms: listing.bedrooms || 1,
          beds: listing.beds || 1,
          bathrooms: listing.bathrooms || 1,
          roomType: listing.roomType || 'Entire place',
          propertyType: 'House' // Default value
        };
        
        // Remove old fields
        if (!updateData.$unset) updateData.$unset = {};
        Object.assign(updateData.$unset, {
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          roomType: 1
        });
      }
      
      // 5. Add default values for new fields
      if (!listing.minGuests) {
        updateData.minGuests = 1;
      }
      if (!listing.isActive !== undefined) {
        updateData.isActive = true;
      }
      if (!listing.isFeatured !== undefined) {
        updateData.isFeatured = false;
      }
      if (!listing.instantBook !== undefined) {
        updateData.instantBook = false;
      }
      
      // 6. Clean up legacy fields
      if (!updateData.$unset) updateData.$unset = {};
      Object.assign(updateData.$unset, {
        guests: 1,
        houseRules: 1,
        createdAt: 1 // Remove since timestamps: true will handle this
      });
      
      // Apply the migration
      if (Object.keys(updateData).length > 0) {
        await mongoose.connection.collection('listings').updateOne(
          { _id: listing._id },
          updateData
        );
        console.log(`Migrated listing: ${listing._id}`);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gharfar')
    .then(() => {
      console.log('Connected to database');
      return migrateListing();
    })
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = migrateListing;
```

## Manual Migration Steps

### 1. Backup Your Database
```bash
mongodump --db gharfar --out backup/
```

### 2. Run the Migration Script
```bash
node migration-script.js
```

### 3. Verify Migration
After running the migration, verify that:

- All listings have the correct structure
- No data was lost
- Old nested fields are removed
- New required fields have default values

### 4. Update Your Frontend Code

#### Old API Usage:
```javascript
// Old way - accessing nested fields
const duration = listing.experienceFields?.experienceDuration;
const groupSize = listing.experienceFields?.experienceGroupSize;
const provider = listing.serviceFields?.serviceProvider;
```

#### New API Usage:
```javascript
// New way - direct access to flattened fields
const duration = listing.duration;
const groupSize = listing.maxGuests;
const provider = listing.provider;

// Type-specific fields remain nested but simplified
const skillLevel = listing.experienceDetails?.skillLevel;
const serviceType = listing.serviceDetails?.serviceType;
const bedrooms = listing.homeDetails?.bedrooms;
```

## API Endpoint Changes

### Enhanced Search Endpoint
```javascript
// GET /api/listings/search
// New query parameters:
{
  q: 'search term',
  listingType: 'Home|Experience|Service',
  category: 'category name',
  minPrice: 50,
  maxPrice: 200,
  maxGuests: 4,
  skillLevel: 'Beginner', // for experiences
  serviceType: 'Consultation', // for services
  roomType: 'Entire place', // for homes
  instantBook: true,
  page: 1,
  limit: 20,
  sortBy: 'price',
  sortOrder: 'asc'
}
```

### New Availability Check Endpoint
```javascript
// GET /api/listings/:id/availability?startDate=2023-12-01&endDate=2023-12-07
{
  "success": true,
  "data": {
    "available": true,
    "effectivePrice": 150
  }
}
```

### Enhanced Response Format
All endpoints now return standardized responses:
```javascript
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": { // for paginated endpoints
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "per_page": 10
  }
}
```

## Testing the Migration

### 1. Test Listing Creation
```javascript
// Test creating each listing type
const homeData = {
  title: "Cozy Apartment",
  description: "Beautiful downtown apartment",
  listingType: "Home",
  price: 120,
  homeDetails: {
    bedrooms: 2,
    bathrooms: 1,
    roomType: "Entire place"
  }
};

const experienceData = {
  title: "City Walking Tour",
  description: "Explore the city",
  listingType: "Experience",
  price: 45,
  duration: "3 hours",
  maxGuests: 10,
  experienceDetails: {
    skillLevel: "All levels"
  }
};

const serviceData = {
  title: "Home Cleaning",
  description: "Professional cleaning service",
  listingType: "Service",
  price: 80,
  provider: "CleanPro",
  serviceDetails: {
    serviceType: "Maintenance"
  }
};
```

### 2. Test Search Functionality
```javascript
// Test various search scenarios
const searches = [
  '/api/listings/search?listingType=Home&maxGuests=4',
  '/api/listings/search?q=apartment&minPrice=100&maxPrice=200',
  '/api/listings/search?listingType=Experience&skillLevel=Beginner',
  '/api/listings/nearby?lat=40.7128&lng=-74.0060&radius=5000'
];
```

## Rollback Plan

If issues arise, you can rollback using your backup:
```bash
mongorestore --db gharfar --drop backup/gharfar/
```

Remember to test thoroughly in a development environment before applying to production!
