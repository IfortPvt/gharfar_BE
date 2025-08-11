# Pet Functionality and Booking Model Enhancements

## Overview
This document details the comprehensive enhancements made to the Gharfar backend to support pet-related functionality similar to Airbnb/Booking.com and the complete refactoring of the booking model.

## 🐾 Pet-Related Enhancements

### Listing Model Pet Policy Fields
- **petsAllowed**: Boolean flag for pet permission
- **petTypes**: Array of allowed pet types (Dog, Cat, Bird, Fish, Rabbit, Other)
- **maxPets**: Maximum number of pets allowed
- **petFee**: Per-pet, per-night fee
- **petDeposit**: One-time refundable pet deposit
- **petRules**: Array of specific pet rules and restrictions
- **assistanceAnimalsAllowed**: Special provision for service animals
- **petAmenities**: Pet-specific amenities (dog park, pet bed, etc.)

### Enhanced Search Capabilities
- **Pet-friendly search**: Filter listings that allow pets
- **Pet type filtering**: Search by specific pet types
- **Pet capacity filtering**: Filter by maximum pets allowed
- **Accessibility search**: Find wheelchair accessible properties

### New API Endpoints

#### Listing Endpoints
```
GET /api/listings/pet-friendly - Get pet-friendly listings
GET /api/listings/accessibility-friendly - Get accessible listings
GET /api/listings/:listingId/calculate-price - Calculate total price including pet fees
```

#### Search Enhancement
```
GET /api/listings/search - Enhanced with pet and accessibility filters
Parameters: petsAllowed, petTypes, maxPets, accessibility, etc.
```

## 📋 Booking Model Refactoring

### Key Improvements
1. **Comprehensive Structure**: Complete redesign from basic booking to full-featured system
2. **Pet Integration**: Full pet booking support with details and pricing
3. **Multi-status Workflow**: Advanced booking lifecycle management
4. **Pricing Breakdown**: Detailed cost calculation including all fees
5. **Accessibility Support**: Integration with accessibility features

### New Booking Fields

#### Guest Information
- **adults, children, infants**: Detailed guest breakdown
- **totalGuests**: Auto-calculated total

#### Pet Details
```javascript
petDetails: {
  hasPets: Boolean,
  numberOfPets: Number,
  petTypes: [String],
  petInfo: [{
    name: String,
    type: String,
    breed: String,
    weight: Number,
    isServiceAnimal: Boolean,
    vaccinated: Boolean,
    notes: String
  }]
}
```

#### Pricing Breakdown
```javascript
pricing: {
  basePrice: Number,
  pricePerNight: Number,
  subtotal: Number,
  cleaningFee: Number,
  serviceFee: Number,
  petFee: Number,        // NEW: Pet-specific fee
  petDeposit: Number,    // NEW: Pet deposit
  taxes: Number,
  totalAmount: Number
}
```

#### Enhanced Status Management
- **pending**: Awaiting host approval
- **confirmed**: Approved by host
- **checked-in**: Guest has arrived
- **checked-out**: Guest has departed
- **completed**: Booking finished
- **cancelled**: Cancelled by guest/host
- **declined**: Rejected by host
- **expired**: Request expired

#### Check-in/Check-out Details
- **checkInDetails**: Access codes, instructions, actual times
- **checkOutDetails**: Property condition, damages, completion time

### New Booking API Endpoints

#### Core Booking Management
```
POST /api/bookings - Create booking with pet support
GET /api/bookings/my - Get user's bookings
GET /api/bookings/:id - Get specific booking
PUT /api/bookings/:id/status - Update booking status
PUT /api/bookings/:id/cancel - Cancel booking with refund calculation
```

#### Specialized Endpoints
```
GET /api/bookings/upcoming - Get upcoming bookings
GET /api/bookings/past - Get past bookings
GET /api/bookings/with-pets - Get all pet bookings
GET /api/bookings/search - Advanced booking search
PUT /api/bookings/:id/checkin - Check-in management
PUT /api/bookings/:id/checkout - Check-out management
```

#### Availability and Pricing
```
GET /api/bookings/availability/:listingId - Check date availability
GET /api/bookings/calculate-price/:listingId - Calculate booking price
```

## 🔍 Enhanced Search Features

### Advanced Filters
- **Text search**: Title, description, location, tags
- **Location**: City, state, country, geospatial radius
- **Pricing**: Min/max price range
- **Capacity**: Guest count requirements
- **Pet filters**: Pet-friendly, pet types, pet capacity
- **Accessibility**: Wheelchair accessible options
- **Booking preferences**: Instant book, verification status
- **Date availability**: Check availability for specific dates

### Search Response Enhancement
```javascript
{
  "listings": [...],
  "pagination": {...},
  "filters": {
    // Applied filters for reference
    "petsAllowed": true,
    "petTypes": ["Dog", "Cat"],
    "accessibility": true,
    ...
  }
}
```

## 🏗️ Database Enhancements

### Listing Model Indexes
```javascript
// Pet-related indexes
{ 'petPolicy.petsAllowed': 1 }
{ 'petPolicy.petTypes': 1 }
{ 'petPolicy.petFee': 1 }

// Accessibility indexes  
{ 'accessibility.wheelchairAccessible': 1 }

// Compound search indexes
{ 'petPolicy.petsAllowed': 1, price: 1, maxGuests: 1 }
{ location: '2dsphere', 'petPolicy.petsAllowed': 1 }
```

### Booking Model Indexes
```javascript
// Core booking indexes
{ listing: 1, checkIn: 1, checkOut: 1 }
{ guest: 1, status: 1 }
{ host: 1, status: 1 }
{ bookingNumber: 1 }
{ 'petDetails.hasPets': 1 }

// TTL index for pending bookings
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

## 🧠 Business Logic Enhancements

### Listing Model Methods
```javascript
// Pet-related methods
isPetFriendly() - Check if pets are allowed
canAccommodatePets(petCount) - Validate pet capacity
getTotalPrice(guests, pets, nights) - Calculate total including pet fees

// Enhanced search
searchListings(params) - Comprehensive search with all filters
findPetFriendly(filters) - Find pet-friendly listings
```

### Booking Model Methods
```javascript
// Booking lifecycle
canBeCancelled() - Check if cancellation is allowed
calculateRefund(policy) - Calculate refund amount
isExpired() - Check if booking request expired
requiresHostApproval() - Check if instant book

// Static methods
findByDateRange() - Find overlapping bookings
findWithPets() - Find bookings with pets
findUpcomingBookings() - Get upcoming bookings
findPastBookings() - Get historical bookings
```

## 💡 Key Features

### Airbnb-Style Pet Search
- Search specifically for pet-friendly properties
- Filter by pet types and capacity
- Automatic pet fee calculation
- Pet policy display and validation

### Accessibility Integration
- Wheelchair accessible property search
- Accessibility amenities support
- Special accommodation requests

### Advanced Booking Workflow
- Multi-step booking approval process
- Automatic booking expiration (24 hours)
- Comprehensive refund calculation
- Check-in/check-out management
- Pet accommodation validation

### Pricing Intelligence
- Dynamic pricing with all fees included
- Pet fee calculation per night/pet
- Refundable pet deposit handling
- Service fee and tax calculation
- Transparent pricing breakdown

## 🔄 Migration Considerations

### Data Migration
- Existing bookings will need property → listing field migration
- User field needs to be split into guest/host
- Add default pet policy to existing listings
- Initialize new booking status workflow

### API Compatibility
- Old booking endpoints maintained for backward compatibility
- Enhanced responses include additional pet and pricing data
- New search parameters are optional and backward compatible

## 🚀 Testing Recommendations

### Pet Functionality Tests
1. Create pet-friendly listings with various policies
2. Test pet search filters and combinations
3. Validate pet fee calculations
4. Test pet capacity restrictions
5. Verify accessibility search functionality

### Booking System Tests
1. Test complete booking lifecycle with pets
2. Validate pricing calculations including pet fees
3. Test booking status transitions
4. Check availability overlap detection
5. Verify refund calculations
6. Test check-in/check-out workflows

### Integration Tests
1. Booking creation with pet validation against listing policy
2. Search integration with pet and accessibility filters
3. Price calculation consistency between listing and booking
4. User permission validation across guest/host roles

## 📈 Future Enhancements

### Potential Additions
- Pet photo uploads for bookings
- Pet insurance integration
- Veterinary service partnerships
- Pet activity recommendations
- Enhanced accessibility features (audio descriptions, etc.)
- Dynamic pricing based on pet demand
- Pet review system
- Multiple pet policy tiers

This comprehensive enhancement transforms Gharfar into a modern, pet-friendly booking platform comparable to industry leaders while maintaining robust booking management capabilities.
