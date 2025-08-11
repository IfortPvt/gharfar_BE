# Listing API Documentation

## Overview
The Listing API provides comprehensive CRUD operations for managing property listings, experiences, and services. The API supports three types of listings: `Home`, `Experience`, and `Service`, each with their own specific fields while sharing common functionality.

## Base URL
```
/api/listings
```

## Authentication
Most endpoints require authentication. Protected endpoints are marked with 🔒.

---

## Endpoints

### 1. Get All Listings
```http
GET /api/listings
```

**Query Parameters:**
- `listingType` (optional): Filter by type (`Home`, `Experience`, `Service`)
- `category` (optional): Filter by category
- `city`, `state`, `country` (optional): Location filters
- `isActive` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Cozy Downtown Apartment",
      "description": "Beautiful apartment...",
      "listingType": "Home",
      "category": "Apartment",
      "price": 120,
      "maxGuests": 4,
      "homeDetails": {
        "bedrooms": 2,
        "bathrooms": 1,
        "roomType": "Entire place"
      },
      "host": {
        "_id": "...",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "amenities": [...],
      "images": [...]
    }
  ],
  "count": 25
}
```

### 2. Search Listings
```http
GET /api/listings/search
```

**Query Parameters:**
- `q` (optional): Search term (searches title, description, category)
- `listingType` (optional): `Home`, `Experience`, or `Service`
- `category` (optional): Category filter
- `minPrice`, `maxPrice` (optional): Price range
- `city`, `state`, `country` (optional): Location filters
- `maxGuests` (optional): Minimum guest capacity
- `amenities` (optional): Comma-separated amenity IDs
- `skillLevel` (optional): For experiences (`Beginner`, `Intermediate`, `Advanced`, `All levels`)
- `serviceType` (optional): For services (`Consultation`, `Installation`, etc.)
- `roomType` (optional): For homes (`Entire place`, `Private room`, `Shared room`)
- `propertyType` (optional): For homes (`House`, `Apartment`, etc.)
- `instantBook` (optional): `true` for instant bookable only
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (`createdAt`, `price`, `title`, `maxGuests`)
- `sortOrder` (optional): `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 95,
    "per_page": 20
  }
}
```

### 3. Get Nearby Listings
```http
GET /api/listings/nearby
```

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude  
- `radius` (optional): Search radius in meters (default: 10000)
- All search filters from `/search` endpoint also apply

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 15
}
```

### 4. Get Listing by ID
```http
GET /api/listings/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Amazing Beach House",
    "description": "...",
    "listingType": "Home",
    "price": 250,
    "location": {
      "type": "Point",
      "coordinates": [-74.0060, 40.7128]
    },
    "homeDetails": {
      "bedrooms": 3,
      "beds": 4,
      "bathrooms": 2,
      "roomType": "Entire place",
      "propertyType": "House"
    },
    "availability": [
      {
        "start": "2023-12-01T00:00:00.000Z",
        "end": "2023-12-31T23:59:59.000Z",
        "isAvailable": true,
        "specialPricing": 300
      }
    ]
  }
}
```

### 5. Check Availability
```http
GET /api/listings/:id/availability
```

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "effectivePrice": 275
  }
}
```

### 6. Create Listing 🔒
```http
POST /api/listings
```

**Content-Type:** `multipart/form-data` (for image uploads)

**Request Body:**
```json
{
  "title": "Cozy Mountain Cabin",
  "description": "Perfect retreat in the mountains",
  "listingType": "Home",
  "category": "Cabin",
  "price": 180,
  "address": "123 Mountain Rd",
  "city": "Aspen",
  "state": "Colorado",
  "country": "USA",
  "latitude": 39.1911,
  "longitude": -106.8175,
  "maxGuests": 6,
  "minGuests": 2,
  "includes": ["WiFi", "Kitchen", "Parking"],
  "highlights": ["Mountain views", "Hot tub", "Fireplace"],
  "rules": "No smoking, no pets",
  "homeDetails": {
    "bedrooms": 3,
    "beds": 4,
    "bathrooms": 2,
    "roomType": "Entire place",
    "propertyType": "Cabin"
  },
  "amenities": ["amenity_id_1", "amenity_id_2"],
  "instantBook": true,
  "availability": [
    {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.000Z",
      "isAvailable": true
    }
  ]
}
```

**Experience Listing Example:**
```json
{
  "title": "Photography Workshop",
  "description": "Learn professional photography techniques",
  "listingType": "Experience",
  "category": "Photography",
  "price": 120,
  "duration": "4 hours",
  "startTime": "9:00 AM",
  "endTime": "1:00 PM",
  "maxGuests": 8,
  "languages": ["English", "Spanish"],
  "provider": "Professional photographer with 10+ years experience",
  "includes": ["Camera rental", "Editing software tutorial", "Print voucher"],
  "highlights": ["Hands-on learning", "Small group size", "All skill levels welcome"],
  "requirements": ["Bring your own camera or rent ours", "Comfortable walking shoes"],
  "experienceDetails": {
    "skillLevel": "All levels",
    "ageRestriction": "16+",
    "physicalRequirements": "Moderate walking required",
    "weatherDependency": true
  }
}
```

**Service Listing Example:**
```json
{
  "title": "Professional Home Cleaning",
  "description": "Comprehensive residential cleaning service",
  "listingType": "Service",
  "category": "Cleaning",
  "price": 150,
  "duration": "3-4 hours",
  "provider": "Licensed cleaning professionals",
  "includes": ["All cleaning supplies", "Equipment", "Insurance coverage"],
  "highlights": ["Eco-friendly products", "Background-checked staff", "Satisfaction guarantee"],
  "serviceDetails": {
    "serviceType": "Maintenance",
    "qualification": "Licensed, bonded, and insured professionals",
    "equipment": ["Professional vacuum", "Cleaning supplies", "Microfiber cloths"],
    "travelRadius": 30,
    "emergencyService": false
  }
}
```

### 7. Update Listing 🔒
```http
PUT /api/listings/:id
```

**Request Body:** Same structure as create, but all fields are optional

### 8. Upload Images 🔒
```http
POST /api/listings/:id/images
```

**Content-Type:** `multipart/form-data`
**Body:** Images as form data (max 10 files)

### 9. Remove Image 🔒
```http
DELETE /api/listings/:listingId/images/:imageId
```

### 10. Update Image Order 🔒
```http
PUT /api/listings/:listingId/images/order
```

**Request Body:**
```json
{
  "imageOrder": [
    { "imageId": "img1", "order": 0 },
    { "imageId": "img2", "order": 1 }
  ]
}
```

### 11. Update Image Flags 🔒
```http
PUT /api/listings/:listingId/images/:imageId/flags
```

**Request Body:**
```json
{
  "isFeatured": true,
  "isMainImage": false
}
```

### 12. Get Listing Amenities
```http
GET /api/listings/:listingId/amenities
```

### 13. Update Listing Amenities 🔒
```http
PUT /api/listings/:listingId/amenities
```

**Request Body:**
```json
{
  "amenities": ["amenity_id_1", "amenity_id_2", "amenity_id_3"]
}
```

---

## Data Models

### Listing Schema
```typescript
interface Listing {
  _id: string;
  
  // Core information
  title: string;
  description: string;
  listingType: 'Home' | 'Experience' | 'Service';
  category?: string;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  
  // Pricing and host
  price: number;
  salePrice?: number;
  host: string; // User ID
  
  // Common timing and capacity
  duration?: string;
  startTime?: string;
  endTime?: string;
  startDate?: Date;
  endDate?: Date;
  maxGuests?: number;
  minGuests?: number;
  
  // Content and provider info
  languages?: string[];
  provider?: string;
  includes?: string[];
  highlights?: string[];
  requirements?: string[];
  rules?: string;
  
  // Type-specific details
  homeDetails?: {
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    roomType?: 'Entire place' | 'Private room' | 'Shared room';
    propertyType?: 'House' | 'Apartment' | 'Condo' | 'Villa' | 'Cabin' | 'Other';
  };
  
  experienceDetails?: {
    skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
    ageRestriction?: 'All ages' | '18+' | '21+' | 'Custom';
    customAgeRequirement?: string;
    physicalRequirements?: string;
    weatherDependency?: boolean;
  };
  
  serviceDetails?: {
    serviceType?: 'Consultation' | 'Installation' | 'Maintenance' | 'Delivery' | 'Other';
    qualification?: string;
    equipment?: string[];
    travelRadius?: number;
    emergencyService?: boolean;
  };
  
  // Relations and status
  amenities: string[]; // Amenity IDs
  reviews: string[]; // Review IDs
  isActive: boolean;
  isFeatured: boolean;
  instantBook: boolean;
  
  // Availability
  availability: Array<{
    start: Date;
    end: Date;
    isAvailable: boolean;
    specialPricing?: number;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  images?: Image[];
}
```

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "code": "ERROR_CODE"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
