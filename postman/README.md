# 📁 Postman Collections - Gharfar Listing Images Management

## 🚀 Quick Start

This folder contains comprehensive Postman collections and documentation for testing Gharfar's Listing Images Management APIs.

### 📦 What's Included

| File | Description |
|------|-------------|
| `Gharfar_Listing_Images_Management.postman_collection.json` | Complete API collection with 30+ endpoints |
| `Gharfar_Listing_Images_Environment.postman_environment.json` | Environment variables and configuration |
| `GHARFAR_LISTING_IMAGES_POSTMAN_GUIDE.md` | Comprehensive usage guide |
| `SAMPLE_TEST_DATA.md` | Realistic test data and payloads |
| `validate_environment.sh` | Environment validation script |
| `README.md` | This file |

## ⚡ Quick Setup (30 seconds)

### 1. Import to Postman
```bash
# Import both files in Postman:
# 1. Gharfar_Listing_Images_Management.postman_collection.json
# 2. Gharfar_Listing_Images_Environment.postman_environment.json
```

### 2. Validate Environment
```bash
# Run the validation script
cd postman/
./validate_environment.sh
```

### 3. Start Testing
- Select the imported environment in Postman
- Run "Host Login" or "Admin Login" 
- Start testing image operations!

## 🎯 Collection Features

### 🔐 Authentication
- Host and Admin login flows
- Automatic token management
- Role-based access testing

### 🏠 Host Operations
- **Upload**: Multiple images with descriptions/tags
- **Organize**: Reorder, set featured/main images
- **Update**: Metadata, descriptions, tags
- **Delete**: Single or bulk image removal

### ⚡ Admin Operations  
- **Full Control**: Manage any listing's images
- **Moderation**: Approve/reject/flag content
- **Bulk Operations**: Process multiple images
- **Analytics**: Platform-wide image statistics

### 📊 Advanced Features
- **Search & Filter**: Find images by tags, dates, status
- **Image Processing**: Generate thumbnails, optimize
- **Quality Control**: Automated validation checks
- **Reporting**: Comprehensive analytics

## 🛠️ API Coverage

### Core Endpoints (30+)
```
POST   /api/listings/:id/images              # Upload images
GET    /api/listings/:id/images              # Get images
PUT    /api/listings/:id/images/order        # Reorder images
PUT    /api/listings/:id/images/:imageId     # Update image
DELETE /api/listings/:id/images/:imageId     # Delete image

# Admin endpoints
GET    /api/admin/listings/:id/images        # Admin view
POST   /api/admin/listings/:id/images        # Admin upload
PUT    /api/admin/images/:id/status          # Approve/reject
POST   /api/admin/images/bulk-operation      # Bulk operations

# Analytics & utilities  
GET    /api/admin/images/statistics          # Platform stats
POST   /api/admin/images/generate-thumbnails # Create thumbnails
POST   /api/admin/images/:id/validate        # Quality checks
```

## 📋 Testing Scenarios

### 🏠 Host Workflow
1. **Login** → Get authentication token
2. **Upload** → Add images to listing  
3. **Organize** → Set main/featured images
4. **Update** → Add descriptions and tags
5. **Manage** → Reorder and delete images

### ⚡ Admin Workflow  
1. **Login** → Get admin token
2. **Review** → Check pending images
3. **Moderate** → Approve/reject content
4. **Analyze** → View platform statistics  
5. **Process** → Bulk operations

## 🔧 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `baseUrl` | API endpoint | `http://localhost:3000` |
| `hostToken` | Host authentication | Auto-populated |
| `adminToken` | Admin authentication | Auto-populated |
| `listingId` | Test listing ID | `675abc123def456789012344` |
| `imageId` | Test image ID | `675abc123def456789012345` |

## 📚 Documentation

### 📖 Complete Guides
- **[Postman Guide](GHARFAR_LISTING_IMAGES_POSTMAN_GUIDE.md)** - Detailed usage instructions
- **[Sample Data](SAMPLE_TEST_DATA.md)** - Realistic test payloads and examples

### 🚨 Troubleshooting
- **Invalid Token**: Re-run login requests
- **Permission Denied**: Check user role and listing ownership  
- **File Upload Fails**: Verify file size and format
- **Validation Errors**: Check required fields and data types

## 🎯 Best Practices

### ✅ Do
- Run authentication first
- Use realistic test data  
- Test both success and error scenarios
- Verify response formats
- Clean up test images

### ❌ Don't  
- Use production data for testing
- Skip authentication steps
- Upload large files repeatedly
- Test with invalid file formats
- Leave test data in database

## 🔍 Monitoring & Analytics

The collection includes:
- **Response time monitoring** (< 5 seconds)
- **Status code validation** (200, 201, 204)
- **Automatic token management**
- **Request/response logging**
- **Error tracking**

## 🆘 Support

### Getting Help
1. **Check Documentation**: Review the guide files first
2. **Validate Environment**: Run `./validate_environment.sh`  
3. **Review Errors**: Check response messages and status codes
4. **Test Incrementally**: Start with simple requests
5. **Contact Team**: Provide specific error details

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Server not responding | Check if backend is running on correct port |
| Authentication fails | Verify user credentials and database seeding |
| File upload errors | Check file size limits and supported formats |
| Permission errors | Ensure user has correct role (host/admin) |
| Validation failures | Review request payload format |

## 🚀 Advanced Usage

### Automation Testing
```bash
# Run collection via Newman CLI
newman run Gharfar_Listing_Images_Management.postman_collection.json \
  -e Gharfar_Listing_Images_Environment.postman_environment.json \
  --reporters html,json
```

### CI/CD Integration
```yaml
# Example GitHub Actions step
- name: Run API Tests
  run: |
    newman run postman/Gharfar_Listing_Images_Management.postman_collection.json \
      -e postman/Gharfar_Listing_Images_Environment.postman_environment.json \
      --bail
```

## 📈 Metrics & KPIs

Track these metrics during testing:
- **Response Times**: < 5s for all endpoints
- **Success Rate**: > 95% for valid requests  
- **Error Handling**: Proper error codes and messages
- **File Upload**: Support for images up to 10MB
- **Concurrent Users**: Handle multiple simultaneous uploads

## 🎊 Happy Testing!

This collection provides everything needed to thoroughly test Gharfar's listing image management system. Follow the guides, use the sample data, and don't hesitate to reach out if you need help!

---

**📞 Support**: Contact the development team with any questions
**📝 Updates**: Check for collection updates regularly
**🔄 Feedback**: Share your testing experience and suggestions
