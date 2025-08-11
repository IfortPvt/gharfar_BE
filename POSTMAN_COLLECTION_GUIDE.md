# Updated Postman Collection with Pet Functionality and Enhanced Booking System

## Overview
The Postman collection has been completely updated to include comprehensive testing for the enhanced Gharfar backend with pet-related functionality and a refactored booking system. This document outlines all the new features and test scenarios available in the collection.

## 🔧 Collection Structure

### 1. Authentication (Auth)
- **Register**: Create new user accounts with role specification
- **Login**: Authenticate users and get access tokens
- **Forgot Password**: Request password reset
- **Reset Password**: Complete password reset process

### 2. Users
- **Get Profile**: Retrieve user profile information
- **Update Profile**: Modify user details
- **Change Password**: Update user password

### 3. Enhanced Amenities Module
The amenities section now includes comprehensive testing for different amenity categories:

#### Basic Amenities
- **Create Basic Amenity**: WiFi, heating, AC
- **Create Pet Amenity**: Pet-specific facilities
- **Create Accessibility Amenity**: Wheelchair accessible features
- **Create Luxury Amenity**: Premium features like hot tubs
- **Create Kitchen Amenity**: Full kitchen facilities
- **Bulk Create Amenities**: Create multiple amenities at once

#### Standard Operations
- **Get All Amenities**: Retrieve all available amenities
- **Update Amenity**: Modify existing amenities
- **Delete Amenity**: Remove amenities

### 4. Enhanced Listings Module
The listings module has been significantly expanded with pet and accessibility functionality:

#### Listing Creation (Multiple Types)
- **Create Home Listing**: Standard apartment/house with pet policy and accessibility features
- **Create Pet-Friendly Home Listing**: Specialized listing with comprehensive pet amenities
- **Create Experience Listing**: Activity/tour listings
- **Create Service Listing**: Professional service offerings

#### Advanced Search Capabilities
- **Basic Search**: Traditional search with price, location, guest filters
- **Enhanced Search with Pet Filters**: Includes pet-related parameters:
  - `petsAllowed=true`: Pet-friendly properties only
  - `petTypes=Dog,Cat`: Specific pet types
  - `maxPets=2`: Pet capacity
  - `accessibility=true`: Wheelchair accessible
- **Get Pet-Friendly Listings**: Dedicated endpoint for pet accommodations
- **Get Accessibility-Friendly Listings**: Specialized accessibility search

#### Utility Endpoints
- **Get Nearby Listings**: Location-based search
- **Check Availability**: Date range availability
- **Calculate Total Price**: Including pet fees and deposits
- **Get Listing by ID**: Individual listing details
- **Image Management**: Upload, remove, reorder images
- **Amenity Management**: Assign amenities to listings

### 5. Comprehensive Booking Module
The booking system has been completely refactored with advanced functionality:

#### Booking Creation
- **Create Booking (Pet-Friendly)**: Complete booking with pet details including:
  - Pet information (name, type, breed, weight, age)
  - Vaccination status and service animal designation
  - Pet-specific accommodation requests
- **Create Regular Booking**: Standard booking without pets

#### Booking Management
- **Get My Bookings**: User's bookings with status filtering
- **Get Upcoming Bookings**: Future reservations
- **Get Past Bookings**: Historical bookings
- **Get Booking by ID**: Individual booking details
- **Search Bookings**: Advanced search with multiple filters

#### Specialized Booking Queries
- **Get Bookings with Pets**: Filter all pet-related bookings
- **Check Availability**: Verify date availability for listings
- **Calculate Booking Price**: Dynamic pricing including pet fees

#### Booking Lifecycle Management
- **Update Booking Status**: Change booking status (pending → confirmed → checked-in → completed)
- **Cancel Booking**: Cancel with refund calculation
- **Check In**: Record arrival with access details
- **Check Out**: Record departure with property condition

### 6. Location Management
- **Countries**: Create and retrieve countries
- **States**: Manage states/provinces
- **Cities**: City management with country/state relationships

### 7. Reviews (Legacy)
- Standard review functionality for properties

## 🐾 Pet-Related Features in Detail

### Pet Policy Schema (in Listings)
```json
{
  "petPolicy": {
    "petsAllowed": true,
    "petTypes": ["Dog", "Cat", "Rabbit"],
    "maxPets": 3,
    "petFee": 30,
    "petDeposit": 200,
    "petRules": [
      "Pets must be supervised in yard",
      "Clean up after pets immediately",
      "No pets on beds or furniture"
    ],
    "assistanceAnimalsAllowed": true,
    "petAmenities": [
      "Large fenced yard",
      "Pet beds and toys",
      "Food and water stations"
    ]
  }
}
```

### Pet Details in Bookings
```json
{
  "petDetails": {
    "hasPets": true,
    "numberOfPets": 2,
    "petTypes": ["Dog", "Cat"],
    "petInfo": [
      {
        "name": "Max",
        "type": "Dog",
        "breed": "Golden Retriever",
        "weight": 65,
        "age": 3,
        "isServiceAnimal": false,
        "vaccinated": true,
        "notes": "Friendly and well-trained"
      }
    ]
  }
}
```

## 🏠 Accessibility Features

### Accessibility Schema (in Listings)
```json
{
  "accessibility": {
    "wheelchairAccessible": true,
    "stepFreeAccess": true,
    "accessibleParking": true,
    "accessibleBathroom": true,
    "wideEntrances": true,
    "elevatorAccess": true,
    "accessibilityFeatures": [
      "Grab bars in bathroom",
      "Lowered light switches",
      "Wide doorways"
    ]
  }
}
```

## 📊 Enhanced Booking Workflow

### Booking Status Flow
1. **pending** → Host approval required
2. **confirmed** → Approved by host
3. **checked-in** → Guest has arrived
4. **checked-out** → Guest has departed
5. **completed** → Booking finished
6. **cancelled** → Cancelled by user
7. **declined** → Rejected by host

### Pricing Calculation
- Base price per night
- Cleaning fees
- Service fees (12%)
- Pet fees (per pet, per night)
- Pet deposits (refundable)
- Taxes (10%)

## 🔧 Collection Variables

### Core Variables
- `baseUrl`: API base URL (http://localhost:3000)
- `authToken`: Authentication token
- `listingId`: Auto-captured from listing creation
- `bookingId`: Auto-captured from booking creation
- `petFriendlyListingId`: Pet-friendly listing for testing
- `hostUserId` / `guestUserId`: User IDs for role-based testing

### Dynamic Variables
- `dynamicCheckIn`: Auto-generated future check-in date
- `dynamicCheckOut`: Auto-generated check-out date

## 🧪 Automated Testing Features

### Pre-request Scripts
- Dynamic date generation for bookings
- Environment setup logging
- Variable preparation

### Test Scripts
- Response validation (status codes, success fields)
- Auto-capture of IDs (listings, bookings, amenities, users)
- Pet-friendly listing detection
- Role-based user ID capture
- Response data logging for debugging

### Smart ID Management
The collection automatically captures and reuses:
- Listing IDs from creation responses
- Booking IDs for lifecycle testing
- Amenity IDs for assignment
- User IDs based on roles
- Pet-friendly listing IDs for specialized tests

## 🚀 Testing Workflows

### Complete Pet Booking Workflow
1. Create pet amenities
2. Create pet-friendly listing with comprehensive pet policy
3. Search for pet-friendly properties
4. Calculate pricing including pet fees
5. Create booking with detailed pet information
6. Manage booking lifecycle
7. Check-in and check-out with pet considerations

### Accessibility Testing Workflow
1. Create accessibility amenities
2. Create wheelchair-accessible listing
3. Search for accessible properties
4. Book accessible accommodation
5. Verify accessibility features in responses

### Multi-listing Type Testing
1. Create Home, Experience, and Service listings
2. Test type-specific search filters
3. Verify type-specific data structures
4. Test cross-type search functionality

## 📝 Usage Instructions

### Getting Started
1. Set your `baseUrl` variable to your API endpoint
2. Run authentication requests to get tokens
3. Use the auto-captured IDs for dependent requests
4. Test workflows in sequence for comprehensive coverage

### Pet Feature Testing
1. Start with creating pet amenities
2. Create pet-friendly listings
3. Use pet search filters
4. Create bookings with pet details
5. Test pet fee calculations

### Booking Lifecycle Testing
1. Create a listing
2. Check availability
3. Calculate pricing
4. Create booking
5. Update status through the workflow
6. Test cancellation and refunds

This enhanced Postman collection provides comprehensive testing coverage for all the new pet-related and accessibility features, ensuring the Gharfar platform can compete with modern booking platforms like Airbnb and Booking.com.
