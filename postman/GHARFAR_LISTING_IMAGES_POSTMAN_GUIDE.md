# Gharfar Listing Images Management - Postman Collection Guide

## 🏗️ Collection Overview

This Postman collection provides comprehensive API testing for listing image management in the Gharfar platform. It covers all image operations for both hosts and admins, including upload, update, delete, reorder, and featured/main image functionality.

## 📁 Collection Structure

### 🔐 Authentication
- **Host Login**: Get JWT token for host operations
- **Admin Login**: Get JWT token for admin operations

### 🏠 HOST - Image Management
Host users can manage images for their own listings:

#### Upload Operations
- **Upload Multiple Images**: Upload up to 10 images with descriptions and tags
- **Get Listing Images**: Retrieve all images for a specific listing

#### Organization & Ordering
- **Update Image Order**: Reorder images (first image becomes main display)
- **Update Single Image**: Update metadata, descriptions, tags
- **Set Featured Image**: Mark image for search results and previews
- **Set Main Image**: Set primary display image for listing

#### Deletion Operations
- **Delete Single Image**: Remove specific image
- **Bulk Delete Images**: Remove multiple images at once

### ⚡ ADMIN - Image Management
Admin users have full control over all listing images:

#### Admin Operations
- **Get All Listing Images (Admin)**: View any listing's images with pagination
- **Upload Images for Host (Admin)**: Upload images on behalf of hosts
- **Admin Update Image**: Full permissions including status and admin notes
- **Admin Force Set Featured Image**: Override host preferences
- **Admin Approve/Reject Image**: Quality control and moderation
- **Admin Bulk Image Operations**: Bulk approve, reject, delete, feature
- **Admin Delete Image (Force)**: Remove images with policy violations
- **Get Image Analytics (Admin)**: Comprehensive analytics and trends

### 📊 Image Analytics & Reports
Admin analytics and reporting:

- **Get Image Statistics**: Overall platform image metrics
- **Images Pending Review**: Queue of images awaiting approval
- **Flagged Images Report**: Content moderation reports

### 🔍 Search & Filter Images
Advanced search and filtering:

- **Search Images by Tags**: Find images across listings by tags and properties
- **Filter Images by Date Range**: Time-based filtering with multiple criteria

### 🛠️ Image Utilities
Advanced image processing:

- **Generate Image Thumbnails**: Create multiple sized thumbnails
- **Optimize Images**: Compress, resize, format conversion
- **Validate Image Quality**: Automated quality and content checks

## 🚀 Getting Started

### 1. Import Collection and Environment
1. Import `Gharfar_Listing_Images_Management.postman_collection.json`
2. Import `Gharfar_Listing_Images_Environment.postman_environment.json`
3. Select the environment in Postman

### 2. Set Base URL
Update the `baseUrl` variable based on your environment:
- **Local Development**: `http://localhost:3000`
- **Staging**: `https://staging-api.gharfar.com`
- **Production**: `https://api.gharfar.com`

### 3. Authentication Flow
1. Run **Host Login** or **Admin Login** to get JWT tokens
2. Tokens are automatically saved to environment variables
3. All subsequent requests use these tokens automatically

### 4. Update Test Data
Replace placeholder IDs with actual values:
- `listingId`: Valid listing ID from your database
- `imageId`: Valid image ID for testing operations
- `hostId`: Valid host user ID

## 📝 Sample Payloads

### Upload Multiple Images (Host)
```javascript
// Form-data fields
images: [File] // Multiple image files
descriptions: ["Living room view", "Kitchen area", "Bedroom"]
tags: ["living-room", "kitchen", "bedroom"]
```

### Update Image Metadata
```json
{
  "description": "Beautiful living room with panoramic city views",
  "tags": ["living-room", "city-view", "modern", "spacious"],
  "isFeatured": true,
  "isMainImage": false,
  "altText": "Living room with floor-to-ceiling windows"
}
```

### Reorder Images
```json
{
  "imageOrder": [
    {
      "imageId": "675abc123def456789012345",
      "order": 1
    },
    {
      "imageId": "675abc123def456789012346", 
      "order": 2
    }
  ]
}
```

### Admin Bulk Operations
```json
{
  "operation": "approve",
  "imageIds": [
    "675abc123def456789012345",
    "675abc123def456789012346"
  ],
  "adminNotes": "Bulk approved after quality review",
  "notifyHost": true
}
```

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `hostToken` | Host JWT token | Auto-populated from login |
| `adminToken` | Admin JWT token | Auto-populated from login |
| `listingId` | Test listing ID | `675abc123def456789012344` |
| `imageId` | Test image ID | `675abc123def456789012345` |
| `hostId` | Test host ID | `675abc123def456789012348` |
| `timestamp` | Request timestamp | Auto-generated |
| `requestId` | Unique request ID | Auto-generated |

## 📋 Testing Scenarios

### Host Workflow
1. **Login** → Get host token
2. **Upload Images** → Add multiple images to listing
3. **Set Main Image** → Choose primary display image
4. **Set Featured Image** → Select image for search results
5. **Reorder Images** → Arrange display sequence
6. **Update Metadata** → Add descriptions and tags
7. **Delete Images** → Remove unwanted images

### Admin Workflow
1. **Login** → Get admin token
2. **Review Pending Images** → Check images awaiting approval
3. **Approve/Reject Images** → Quality control decisions
4. **Bulk Operations** → Process multiple images
5. **Analytics Review** → Check platform statistics
6. **Content Moderation** → Handle flagged content

## 🛡️ Security & Permissions

### Host Permissions
- Upload images to own listings
- Update/delete own listing images
- Set featured/main images for own listings
- View own listing image analytics

### Admin Permissions
- Full access to all listing images
- Upload images for any host
- Approve/reject any image
- Force delete inappropriate content
- Access platform-wide analytics
- Bulk operations across all listings

## 🚨 Error Handling

Common error responses and solutions:

### Authentication Errors
```json
{
  "status": "error",
  "statusCode": 401,
  "message": "Authentication required"
}
```
**Solution**: Ensure valid JWT token in Authorization header

### Validation Errors
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation Error",
  "details": [
    {
      "field": "images",
      "message": "At least one image is required"
    }
  ]
}
```
**Solution**: Check request payload format and required fields

### File Upload Errors
```json
{
  "status": "error",
  "statusCode": 413,
  "message": "File too large"
}
```
**Solution**: Ensure image files are under size limit (typically 10MB)

## 📊 Response Formats

### Success Response
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Images uploaded successfully",
  "data": {
    "listing": {
      "_id": "675abc123def456789012344",
      "images": [
        {
          "_id": "675abc123def456789012345",
          "url": "/uploads/listings/image1.jpg",
          "description": "Living room view",
          "tags": ["living-room", "modern"],
          "isFeatured": true,
          "isMainImage": false,
          "order": 1,
          "uploadedAt": "2024-12-07T10:30:00.000Z"
        }
      ]
    }
  },
  "meta": {
    "totalImages": 5,
    "imagesUploaded": 3,
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

### Pagination Response
```json
{
  "status": "success",
  "data": {
    "images": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## 🎯 Testing Best Practices

1. **Start with Authentication**: Always run login requests first
2. **Use Valid IDs**: Update collection variables with real database IDs
3. **Test in Sequence**: Follow logical workflow order
4. **Check File Formats**: Use supported image formats (JPG, PNG, WebP)
5. **Verify Permissions**: Test both host and admin access levels
6. **Monitor Responses**: Check response times and data structure
7. **Clean Up**: Delete test images after testing

## 🔍 Monitoring & Analytics

The collection includes automatic monitoring:

- **Response Time Tests**: All requests should complete under 5 seconds
- **Status Code Validation**: Ensures successful response codes
- **Token Management**: Automatically saves and uses JWT tokens
- **Request Tracking**: Unique request IDs for debugging

## 🆘 Troubleshooting

### Common Issues

1. **Invalid Token**: Re-run login request to refresh token
2. **File Upload Fails**: Check file size and format
3. **Permission Denied**: Verify user role and listing ownership
4. **Validation Errors**: Check required fields and data types
5. **Network Issues**: Verify base URL and server status

### Support Resources

- **API Documentation**: Check inline request descriptions
- **Error Messages**: Review detailed error responses
- **Environment Setup**: Verify all variables are configured
- **Server Logs**: Check backend logs for detailed error information

---

## 📞 Support

For technical support or questions about this collection:

1. Check the inline documentation in each request
2. Review error response messages
3. Verify environment configuration
4. Contact the development team with specific error details

**Happy Testing! 🚀**
