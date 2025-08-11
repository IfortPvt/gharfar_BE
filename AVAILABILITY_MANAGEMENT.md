# Listing Availability Management with Special Pricing

## Overview
This document describes the comprehensive availability management system for listings in the Gharfar platform, including special pricing functionality for holidays, peak seasons, and other special periods.

## Features

### 🎯 **Core Functionality**
- **Availability Periods**: Define when a listing is available for booking
- **Special Pricing**: Set different prices for specific date ranges
- **Overlap Prevention**: Automatic validation to prevent conflicting periods
- **Bulk Operations**: Update all availability periods at once
- **Individual Management**: Add, update, or delete specific periods

### 💰 **Special Pricing Use Cases**
- **Holiday Rates**: Higher pricing for Christmas, New Year, etc.
- **Peak Season**: Summer rates, winter ski season premiums
- **Event-Based**: Concert weekends, festival periods
- **Discount Periods**: Off-season rates, last-minute deals
- **Promotional Pricing**: Special offers for certain dates

## Database Schema

### Availability Object Structure
```javascript
availability: [
  {
    _id: ObjectId, // Auto-generated MongoDB ID for the period
    start: Date,   // Period start date (ISO8601)
    end: Date,     // Period end date (ISO8601)
    isAvailable: Boolean, // Whether listing is available (default: true)
    specialPricing: Number // Optional override price for this period
  }
]
```

### Example Data
```javascript
{
  "availability": [
    {
      "start": "2025-08-01T00:00:00.000Z",
      "end": "2025-08-31T23:59:59.000Z", 
      "isAvailable": true
      // Uses regular listing price ($180/night)
    },
    {
      "start": "2025-12-20T00:00:00.000Z",
      "end": "2025-12-31T23:59:59.000Z",
      "isAvailable": true,
      "specialPricing": 350 // Holiday premium pricing
    }
  ]
}
```

## API Endpoints

### 1. Get Listing Availability
**GET** `/api/listings/:id/availability/periods`

Retrieves all availability periods for a listing.

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "507f1f77bcf86cd799439011",
    "title": "Luxury Downtown Apartment",
    "availability": [...]
  }
}
```

### 2. Add Availability Period
**POST** `/api/listings/:id/availability/periods`

Adds a new availability period with optional special pricing.

**Request Body:**
```json
{
  "start": "2025-12-20T00:00:00.000Z",
  "end": "2025-12-31T23:59:59.000Z", 
  "isAvailable": true,
  "specialPricing": 350
}
```

**Validation Rules:**
- `start` and `end` are required and must be valid ISO8601 dates
- `end` must be after `start`
- Period cannot overlap with existing periods
- `specialPricing` must be positive number if provided

### 3. Update Availability Period
**PUT** `/api/listings/:id/availability/periods/:periodId`

Updates an existing availability period.

**Request Body:**
```json
{
  "start": "2025-12-20T00:00:00.000Z",
  "end": "2025-12-31T23:59:59.000Z",
  "isAvailable": true,
  "specialPricing": 400
}
```

**Special Features:**
- Set `specialPricing: null` to remove special pricing
- Partial updates supported (only send fields to change)
- Overlap validation excludes current period

### 4. Delete Availability Period
**DELETE** `/api/listings/:id/availability/periods/:periodId`

Removes a specific availability period.

### 5. Bulk Update Availability
**PUT** `/api/listings/:id/availability`

Replaces all availability periods with new set.

**Request Body:**
```json
{
  "availability": [
    {
      "start": "2025-08-01T00:00:00.000Z",
      "end": "2025-08-31T23:59:59.000Z",
      "isAvailable": true
    },
    {
      "start": "2025-12-20T00:00:00.000Z", 
      "end": "2025-12-31T23:59:59.000Z",
      "isAvailable": true,
      "specialPricing": 500
    }
  ]
}
```

## Service Layer Functions

### Core Functions

#### `getListingAvailability(listingId)`
Retrieves availability for a specific listing.

#### `addAvailabilityPeriod(listingId, availabilityData)` 
Adds new period with overlap validation.

#### `updateAvailabilityPeriod(listingId, periodId, updateData)`
Updates existing period with validation.

#### `deleteAvailabilityPeriod(listingId, periodId)`
Removes specific availability period.

#### `updateListingAvailability(listingId, availabilityData)`
Bulk replace all periods with validation.

### Validation Features
- **Date Validation**: Ensures proper date formats and logic
- **Overlap Detection**: Prevents conflicting availability periods
- **Price Validation**: Ensures special pricing is valid when provided
- **Existence Checks**: Verifies listing and period existence

## Postman Collection Tests

### Test Scenarios Included

1. **Get Listing Availability Periods**
   - Validates response structure
   - Captures period IDs for subsequent tests

2. **Add Availability Period with Special Pricing**
   - Tests holiday pricing scenario
   - Validates period creation and ID capture

3. **Add Regular Availability Period**
   - Tests standard availability without special pricing
   - Ensures default pricing behavior

4. **Update Availability Period**
   - Tests period modification
   - Validates special pricing updates

5. **Delete Availability Period**
   - Tests period removal functionality
   - Ensures proper cleanup

6. **Bulk Update Listing Availability**
   - Tests complete availability replacement
   - Validates multiple periods with mixed pricing
   - Tests overlap prevention

### Test Data Examples

**Holiday Premium Pricing:**
```javascript
{
  "start": "2025-12-20T00:00:00.000Z",
  "end": "2025-12-31T23:59:59.000Z",
  "isAvailable": true,
  "specialPricing": 500 // $500/night for holidays
}
```

**Peak Season Pricing:**
```javascript
{
  "start": "2025-07-01T00:00:00.000Z", 
  "end": "2025-08-31T23:59:59.000Z",
  "isAvailable": true,
  "specialPricing": 250 // $250/night for summer
}
```

## Integration with Existing Systems

### Booking System Integration
- Booking price calculation uses `getEffectivePrice()` method
- Automatically applies special pricing when booking dates fall within special periods
- Availability checking prevents bookings during unavailable periods

### Price Calculation Logic
```javascript
// From Listing model method
getEffectivePrice(date) {
  if (!date) return this.salePrice || this.price;
  
  const targetDate = new Date(date);
  const specialPricing = this.availability.find(slot => {
    return targetDate >= slot.start && 
           targetDate <= slot.end && 
           slot.specialPricing;
  });
  
  return specialPricing?.specialPricing || this.salePrice || this.price;
}
```

### Search Integration
- Search results can filter by availability dates
- Price ranges in search consider special pricing periods
- Availability status affects search visibility

## Use Case Examples

### 1. Holiday Property Management
```bash
# Set regular availability
POST /api/listings/123/availability/periods
{
  "start": "2025-08-01T00:00:00.000Z",
  "end": "2025-12-19T23:59:59.000Z", 
  "isAvailable": true
}

# Add holiday premium period
POST /api/listings/123/availability/periods  
{
  "start": "2025-12-20T00:00:00.000Z",
  "end": "2026-01-05T23:59:59.000Z",
  "isAvailable": true,
  "specialPricing": 500
}
```

### 2. Seasonal Cabin Rental
```javascript
// Bulk set seasonal pricing
PUT /api/listings/456/availability
{
  "availability": [
    {
      "start": "2025-06-01T00:00:00.000Z",
      "end": "2025-08-31T23:59:59.000Z", 
      "isAvailable": true,
      "specialPricing": 300 // Summer rates
    },
    {
      "start": "2025-12-01T00:00:00.000Z",
      "end": "2025-02-28T23:59:59.000Z",
      "isAvailable": true,
      "specialPricing": 400 // Winter ski season
    }
  ]
}
```

### 3. Event-Based Pricing
```javascript
// Concert weekend premium
{
  "start": "2025-09-15T00:00:00.000Z",
  "end": "2025-09-17T23:59:59.000Z",
  "isAvailable": true, 
  "specialPricing": 600 // Triple normal rate
}
```

## Error Handling

### Common Error Scenarios

1. **Overlapping Periods**
   ```json
   {
     "success": false,
     "message": "Availability period overlaps with existing period"
   }
   ```

2. **Invalid Date Range**
   ```json
   {
     "success": false,
     "message": "End date must be after start date"
   }
   ```

3. **Period Not Found**
   ```json
   {
     "success": false,
     "message": "Availability period not found"
   }
   ```

4. **Invalid Special Pricing**
   ```json
   {
     "success": false,
     "message": "Special pricing must be a positive number"
   }
   ```

## Frontend Integration Guidelines

### Display Recommendations

1. **Calendar View**: Show availability periods with color coding
   - Green: Available (regular price)
   - Blue: Available (special pricing)
   - Red: Unavailable
   
2. **Price Display**: Show effective price based on selected dates
   ```javascript
   // Example frontend logic
   const getDisplayPrice = (listing, checkInDate) => {
     return listing.getEffectivePrice(checkInDate);
   };
   ```

3. **Booking Flow**: Automatically calculate total with special pricing
   - Show base price vs. effective price
   - Highlight when special pricing applies
   - Display savings or premiums clearly

### Management Interface

1. **Host Dashboard**: Easy availability management
   - Calendar interface for visual period management
   - Quick actions for common scenarios (holidays, events)
   - Bulk import/export for complex schedules

2. **Pricing Strategy**: Recommendations based on:
   - Historical booking data
   - Local events and holidays
   - Competitor pricing analysis
   - Seasonal demand patterns

## Performance Considerations

### Database Indexing
- Availability periods are indexed for fast date range queries
- Compound indexes support common search patterns
- Efficient aggregation for price calculations

### Caching Strategy
- Cache effective prices for common date ranges
- Invalidate cache when availability changes
- Use Redis for high-traffic price lookups

### Optimization Tips
- Limit maximum number of availability periods per listing
- Encourage hosts to use longer periods vs. many small ones
- Background jobs for bulk availability updates

## Future Enhancements

### Planned Features
1. **Dynamic Pricing**: AI-based price recommendations
2. **Recurring Patterns**: Template-based seasonal schedules
3. **Event Integration**: Automatic pricing for local events
4. **Competitor Analysis**: Market-based pricing suggestions
5. **Revenue Optimization**: Yield management algorithms

### API Extensions
1. **Availability Templates**: Reusable period patterns
2. **Pricing Rules**: Formula-based special pricing
3. **Bulk Operations**: CSV import/export for availability
4. **Analytics**: Revenue impact of special pricing
5. **Notifications**: Alerts for pricing opportunities

This comprehensive availability management system provides hosts with powerful tools to optimize their listing revenue while ensuring a smooth booking experience for guests.
