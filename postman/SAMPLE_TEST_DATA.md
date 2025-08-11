# Gharfar Listing Images - Test Data Samples

## 🎯 Test Data Overview

This document contains sample data and payloads for testing the Listing Images Management APIs. Use these realistic examples to populate your Postman requests.

## 🏠 Sample Listing Data

### Listing IDs for Testing
```javascript
// Modern Apartment in Downtown
const modernApartmentId = "675abc123def456789012344";

// Luxury Villa with Pool
const luxuryVillaId = "675abc123def456789012355";

// Cozy Studio Near Beach
const beachStudioId = "675abc123def456789012366";

// Family House with Garden
const familyHouseId = "675abc123def456789012377";
```

### Sample Image IDs
```javascript
// Living Room Images
const livingRoomMainId = "675abc123def456789012345";
const livingRoomAngle2Id = "675abc123def456789012346";

// Bedroom Images  
const masterBedroomId = "675abc123def456789012347";
const secondBedroomId = "675abc123def456789012348";

// Kitchen Images
const kitchenMainId = "675abc123def456789012349";
const kitchenCounterId = "675abc123def45678901234a";

// Bathroom Images
const masterBathId = "675abc123def45678901234b";
const guestBathId = "675abc123def45678901234c";

// Exterior Images
const frontViewId = "675abc123def45678901234d";
const backyardId = "675abc123def45678901234e";
```

## 📝 Upload Payloads

### 1. Upload Multiple Interior Images (Host)
```json
{
  "descriptions": [
    "Spacious living room with modern furniture and natural light",
    "Master bedroom with king-size bed and city views",
    "Fully equipped kitchen with granite countertops",
    "Luxurious master bathroom with rainfall shower",
    "Cozy reading nook by the window"
  ],
  "tags": [
    ["living-room", "modern", "spacious", "natural-light"],
    ["bedroom", "master", "king-bed", "city-view"],
    ["kitchen", "modern", "granite", "fully-equipped"],
    ["bathroom", "master", "luxury", "rainfall-shower"],
    ["reading-nook", "cozy", "window", "relaxation"]
  ]
}
```

### 2. Upload Exterior Images (Host)
```json
{
  "descriptions": [
    "Beautiful front entrance with landscaped garden",
    "Private backyard with outdoor seating area",
    "Rooftop terrace with panoramic city views",
    "Swimming pool area with lounge chairs",
    "Parking area with covered carport"
  ],
  "tags": [
    ["exterior", "front-entrance", "garden", "landscaped"],
    ["backyard", "private", "outdoor-seating", "patio"],
    ["rooftop", "terrace", "city-views", "panoramic"],
    ["pool", "swimming", "lounge", "relaxation"],
    ["parking", "covered", "carport", "secure"]
  ]
}
```

### 3. Admin Upload for Host
```json
{
  "hostId": "675abc123def456789012388",
  "descriptions": [
    "Professional photography: Living room with staging",
    "Professional photography: Master bedroom setup",
    "Professional photography: Kitchen with proper lighting"
  ],
  "tags": [
    ["professional", "living-room", "staged", "photography"],
    ["professional", "bedroom", "master", "staged"],
    ["professional", "kitchen", "lighting", "photography"]
  ],
  "adminNotes": "High-quality professional images uploaded for improved listing visibility"
}
```

## 🔄 Update Operations

### 1. Set Featured Image
```json
{
  "isFeatured": true,
  "isMainImage": false,
  "description": "Stunning living room that showcases the property's best features",
  "tags": ["featured", "living-room", "showcase", "best-angle"],
  "altText": "Modern living room with large windows and contemporary furniture"
}
```

### 2. Set Main Display Image
```json
{
  "isFeatured": false,
  "isMainImage": true,
  "description": "Primary listing image showing the property's exterior",
  "tags": ["main", "exterior", "front-view", "primary"],
  "altText": "Beautiful property exterior with landscaped front yard"
}
```

### 3. Update Image Metadata
```json
{
  "description": "Updated: Spacious master bedroom with walk-in closet and ensuite",
  "tags": ["bedroom", "master", "spacious", "walk-in-closet", "ensuite", "updated"],
  "altText": "Master bedroom featuring king bed, walk-in closet, and ensuite bathroom",
  "isFeatured": false,
  "isMainImage": false
}
```

### 4. Admin Update with Review Notes
```json
{
  "description": "Admin verified: High-quality kitchen image meeting platform standards",
  "tags": ["kitchen", "verified", "high-quality", "approved"],
  "status": "approved",
  "adminNotes": "Image meets all quality guidelines. Lighting and composition excellent.",
  "reviewComments": "Perfect showcase of the kitchen facilities",
  "isFeatured": true,
  "isMainImage": false
}
```

## 📋 Reorder Operations

### 1. Standard Image Reordering
```json
{
  "imageOrder": [
    {
      "imageId": "675abc123def456789012345",
      "order": 1,
      "description": "Main living room view (first impression)"
    },
    {
      "imageId": "675abc123def456789012347", 
      "order": 2,
      "description": "Master bedroom (key selling point)"
    },
    {
      "imageId": "675abc123def456789012349",
      "order": 3,
      "description": "Modern kitchen (important amenity)"
    },
    {
      "imageId": "675abc123def45678901234b",
      "order": 4,
      "description": "Master bathroom (luxury feature)"
    },
    {
      "imageId": "675abc123def45678901234d",
      "order": 5,
      "description": "Exterior view (context and curb appeal)"
    }
  ]
}
```

### 2. Priority-Based Reordering
```json
{
  "imageOrder": [
    {
      "imageId": "675abc123def45678901234d",
      "order": 1,
      "priority": "high",
      "reason": "First impression exterior shot"
    },
    {
      "imageId": "675abc123def456789012345",
      "order": 2,
      "priority": "high", 
      "reason": "Spacious living area showcase"
    },
    {
      "imageId": "675abc123def456789012349",
      "order": 3,
      "priority": "medium",
      "reason": "Kitchen is a key decision factor"
    }
  ]
}
```

## ⚡ Admin Operations

### 1. Bulk Approval
```json
{
  "operation": "approve",
  "imageIds": [
    "675abc123def456789012345",
    "675abc123def456789012346",
    "675abc123def456789012347"
  ],
  "adminNotes": "Bulk approved - all images meet quality standards",
  "notifyHost": true,
  "reviewComments": "High quality images with excellent lighting and composition"
}
```

### 2. Bulk Rejection
```json
{
  "operation": "reject",
  "imageIds": [
    "675abc123def45678901234x",
    "675abc123def45678901234y"
  ],
  "adminNotes": "Images rejected due to poor lighting and blurry quality",
  "notifyHost": true,
  "reason": "quality_issues",
  "reviewComments": "Please resubmit with better lighting and sharper focus"
}
```

### 3. Content Moderation
```json
{
  "operation": "flag",
  "imageIds": ["675abc123def45678901234z"],
  "adminNotes": "Flagged for manual review - potential policy violation",
  "reason": "inappropriate_content",
  "severity": "high",
  "notifyHost": false,
  "escalate": true
}
```

### 4. Force Delete with Reason
```json
{
  "reason": "Violates community guidelines - inappropriate content detected",
  "adminNotes": "Image removed immediately due to policy violation",
  "notifyHost": true,
  "forceDelete": true,
  "category": "policy_violation",
  "autoFlag": true
}
```

## 🔍 Search & Filter Examples

### 1. Search by Tags
```
GET /api/listings/images/search?tags=bedroom,modern&isFeatured=true&page=1&limit=20
```

### 2. Advanced Filtering
```
GET /api/admin/images/filter?startDate=2024-01-01&endDate=2024-12-31&status=approved&listingType=apartment&tags=kitchen,modern
```

### 3. Pending Review Queue
```
GET /api/admin/images/pending-review?page=1&limit=50&priority=high&uploadedAfter=2024-12-01
```

## 🛠️ Utility Operations

### 1. Generate Thumbnails
```json
{
  "imageIds": [
    "675abc123def456789012345",
    "675abc123def456789012346"
  ],
  "sizes": [
    { "width": 150, "height": 150, "name": "thumbnail" },
    { "width": 300, "height": 200, "name": "small" },
    { "width": 600, "height": 400, "name": "medium" },
    { "width": 1200, "height": 800, "name": "large" }
  ],
  "format": "webp",
  "quality": 85
}
```

### 2. Optimize Images
```json
{
  "listingId": "675abc123def456789012344",
  "quality": 85,
  "maxWidth": 1920,
  "maxHeight": 1080,
  "format": "webp",
  "progressive": true,
  "stripMetadata": true
}
```

### 3. Quality Validation
```json
{
  "imageId": "675abc123def456789012345",
  "checks": [
    "resolution",
    "brightness", 
    "blur",
    "inappropriate_content",
    "duplicate_detection"
  ],
  "thresholds": {
    "minResolution": "1024x768",
    "minBrightness": 30,
    "maxBlur": 15
  }
}
```

## 🧪 Test User Accounts

### Host Accounts
```json
{
  "testHost1": {
    "email": "host1@example.com",
    "password": "host123!",
    "fullName": "John Host",
    "role": "host"
  },
  "testHost2": {
    "email": "host2@example.com", 
    "password": "host456!",
    "fullName": "Sarah Landlord",
    "role": "landlord"
  }
}
```

### Admin Accounts
```json
{
  "adminUser": {
    "email": "admin@gharfar.com",
    "password": "admin123!",
    "fullName": "Admin User",
    "role": "admin"
  },
  "superAdmin": {
    "email": "superadmin@gharfar.com",
    "password": "super123!",
    "fullName": "Super Admin",
    "role": "superadmin"
  }
}
```

## 📊 Expected Response Examples

### Success Response - Image Upload
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Images uploaded successfully",
  "data": {
    "listing": {
      "_id": "675abc123def456789012344",
      "title": "Modern Downtown Apartment",
      "images": [
        {
          "_id": "675abc123def456789012345",
          "url": "/uploads/listings/675abc123def456789012344/living-room-1.jpg",
          "thumbnails": {
            "small": "/uploads/listings/675abc123def456789012344/thumbs/living-room-1-small.jpg",
            "medium": "/uploads/listings/675abc123def456789012344/thumbs/living-room-1-medium.jpg"
          },
          "description": "Spacious living room with modern furniture",
          "tags": ["living-room", "modern", "spacious"],
          "isFeatured": false,
          "isMainImage": false,
          "order": 1,
          "status": "pending",
          "uploadedBy": "675abc123def456789012388",
          "uploadedAt": "2024-12-07T10:30:00.000Z",
          "fileInfo": {
            "originalName": "living-room.jpg",
            "mimeType": "image/jpeg",
            "size": 2456789,
            "dimensions": {
              "width": 1920,
              "height": 1080
            }
          }
        }
      ],
      "imageCount": 5
    }
  },
  "meta": {
    "imagesUploaded": 3,
    "totalImages": 5,
    "pendingReview": 3,
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

### Success Response - Admin Analytics
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalImages": 12547,
      "pendingReview": 234,
      "approved": 11890,
      "rejected": 423,
      "flagged": 15
    },
    "trends": {
      "uploadsThisMonth": 1247,
      "approvalsThisMonth": 1156,
      "averageReviewTime": "2.5 hours"
    },
    "qualityMetrics": {
      "averageResolution": "1680x1050",
      "averageFileSize": "2.3MB",
      "formatDistribution": {
        "jpeg": 8547,
        "png": 2890,
        "webp": 1110
      }
    }
  }
}
```

## 🚨 Error Response Examples

### Validation Error
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation Error",
  "details": [
    {
      "field": "images",
      "message": "At least one image is required",
      "value": []
    },
    {
      "field": "descriptions.0",
      "message": "Description must be at least 10 characters",
      "value": "Nice"
    }
  ],
  "timestamp": "2024-12-07T10:30:00.000Z"
}
```

### File Upload Error
```json
{
  "status": "error",
  "statusCode": 413,
  "message": "File too large",
  "details": {
    "maxSize": "10MB",
    "receivedSize": "15.7MB",
    "fileName": "high-res-photo.jpg"
  }
}
```

### Permission Error
```json
{
  "status": "error",
  "statusCode": 403,
  "message": "Insufficient permissions",
  "details": {
    "required": "admin",
    "current": "host",
    "resource": "bulk image operations"
  }
}
```

---

## 💡 Tips for Testing

1. **Start Small**: Begin with single image uploads before bulk operations
2. **Use Realistic Data**: The sample data above reflects real-world scenarios
3. **Test Edge Cases**: Try invalid IDs, oversized files, missing fields
4. **Check Permissions**: Test both allowed and forbidden operations
5. **Verify Cleanup**: Ensure test data doesn't pollute production
6. **Monitor Performance**: Check response times for large file uploads
7. **Test Rollbacks**: Verify error handling and cleanup on failures

**Happy Testing! 🎯**
