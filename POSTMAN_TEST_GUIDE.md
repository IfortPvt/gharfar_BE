# Gharfar Postman Collection - Test Data Guide

## Overview
This updated Postman collection includes comprehensive test data for the refactored Listing API. The collection now supports all three listing types with realistic dummy data.

## Collection Features

### 🏠 **Home Listings**
- Complete apartment listing with all required fields
- Realistic pricing and availability
- Proper home-specific details (bedrooms, bathrooms, room type)

### 🎯 **Experience Listings**
- Photography workshop example
- Skill level and age restrictions
- Language and provider information
- Weather dependency settings

### 🔧 **Service Listings**
- Professional cleaning service example
- Service type and qualifications
- Travel radius and equipment lists
- Emergency service options

## Quick Start Guide

### 1. **Set Up Variables**
Before testing, update these collection variables:
- `baseUrl`: Your server URL (default: http://localhost:3000)
- `authToken`: Get this from the Login endpoint
- Other variables will be auto-populated during testing

### 2. **Create Test Data Sequence**
Run these requests in order to set up comprehensive test data:

1. **Authentication**
   - Register a new user
   - Login to get auth token

2. **Create Amenities** (Optional)
   - WiFi, Kitchen, Air Conditioning, etc.
   - Note the amenity IDs for listings

3. **Create Listings**
   - Create Home Listing
   - Create Experience Listing
   - Create Service Listing

4. **Test Search & Filters**
   - Search by type, price, location
   - Test nearby search with coordinates
   - Check availability for specific dates

### 3. **Example Workflow**

#### Create a Complete Home Listing:
```bash
POST /api/listings
```
Use the "Create Home Listing" request with the pre-filled data:
- Luxury Downtown Apartment
- $180/night (sale price: $150)
- 2 bedrooms, 1 bathroom
- City center location
- Complete amenities and highlights

#### Search for Listings:
```bash
GET /api/listings/search?listingType=Home&minPrice=100&maxPrice=200
```

#### Check Availability:
```bash
GET /api/listings/{listingId}/availability?startDate=2024-03-15&endDate=2024-03-20
```

## Test Data Details

### Home Listing Example
```json
{
  "title": "Luxury Downtown Apartment",
  "listingType": "Home",
  "price": 180,
  "maxGuests": 4,
  "homeDetails": {
    "bedrooms": 2,
    "bathrooms": 1,
    "roomType": "Entire place",
    "propertyType": "Apartment"
  }
}
```

### Experience Listing Example
```json
{
  "title": "Photography Walking Tour",
  "listingType": "Experience",
  "duration": "3 hours",
  "price": 85,
  "experienceDetails": {
    "skillLevel": "Beginner",
    "ageRestriction": "All ages"
  }
}
```

### Service Listing Example
```json
{
  "title": "Professional Home Cleaning Service",
  "listingType": "Service",
  "price": 120,
  "serviceDetails": {
    "serviceType": "Maintenance",
    "travelRadius": 25
  }
}
```

## Advanced Search Examples

### 1. **Search Homes by Criteria**
```
GET /api/listings/search?listingType=Home&minPrice=100&maxPrice=300&maxGuests=4&roomType=Entire place
```

### 2. **Find Beginner Experiences**
```
GET /api/listings/search?listingType=Experience&skillLevel=Beginner&maxGuests=10
```

### 3. **Search Services by Type**
```
GET /api/listings/search?listingType=Service&serviceType=Maintenance&maxPrice=150
```

### 4. **Location-Based Search**
```
GET /api/listings/nearby?lat=40.7489&lng=-73.9680&radius=5000
```

### 5. **Paginated Results**
```
GET /api/listings/search?page=1&limit=10&sortBy=price&sortOrder=asc
```

## Response Format
All endpoints now return standardized responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": { // for search endpoints
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "per_page": 10
  }
}
```

## Image Upload Testing

### Upload Images
1. First create a listing and note the `listingId`
2. Use the "Upload Listing Images" request
3. Select multiple image files (max 10)
4. Images will be processed and linked to the listing

### Manage Images
- Update image order with drag-and-drop simulation
- Set featured and main images
- Remove unwanted images

## Validation Testing

The collection includes requests that will trigger validation errors:
- Missing required fields
- Invalid listing types
- Out-of-range values
- Invalid date formats

## Environment Setup

### Local Development
```json
{
  "baseUrl": "http://localhost:3000",
  "authToken": "your_jwt_token_here"
}
```

### Production Testing
```json
{
  "baseUrl": "https://your-production-url.com",
  "authToken": "production_jwt_token"
}
```

## Auto-Generated Variables

The collection automatically captures and stores:
- `listingId` from create listing responses
- `imageId` from image upload responses
- `amenityId` from amenity creation

## Troubleshooting

### Common Issues:
1. **Authentication errors**: Ensure auth token is valid
2. **Validation errors**: Check required fields in request body
3. **404 errors**: Verify listing IDs exist
4. **500 errors**: Check server logs for detailed error info

### Debug Tips:
- Use the console tab to see auto-captured variables
- Check the test results tab for validation feedback
- Review request/response details for API debugging

## Testing Checklist

- [ ] Create all three listing types successfully
- [ ] Search and filter functionality works
- [ ] Nearby search returns location-based results
- [ ] Availability checking works with date ranges
- [ ] Image upload and management functions
- [ ] Amenity assignment and updates work
- [ ] Validation catches invalid data
- [ ] Pagination works correctly
- [ ] Response format is consistent

This collection provides comprehensive testing coverage for the refactored Listing API with realistic test data for immediate use.
