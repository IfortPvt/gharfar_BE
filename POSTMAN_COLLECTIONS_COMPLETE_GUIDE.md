# 🚀 Gharfar API - Complete Postman Collections

Welcome to the comprehensive Postman collection suite for the Gharfar platform! This collection covers every aspect of the Airbnb clone backend system.

## 📋 Collection Overview

### 🔗 **Part 1: Authentication & User Management**
**File:** `Part_1_Auth_Users.postman_collection.json`

**Coverage:**
- ✅ User Registration (Guest, Host, Admin)
- ✅ User Login & Authentication
- ✅ Profile Management
- ✅ Password Management
- ✅ Email Verification
- ✅ User Activity Tracking
- ✅ Admin User Management

**Key Features:**
- Enhanced user schema with last login tracking
- Activity monitoring and session management
- Comprehensive verification system
- Role-based permission management
- Admin controls for user suspension/reactivation

### 🏠 **Part 2: Listings & Amenities**
**File:** `Part_2_Listings_Amenities.postman_collection.json`

**Coverage:**
- ✅ Listing Creation (Home, Experience, Service)
- ✅ Enhanced Amenity System
- ✅ Pet-Friendly Features
- ✅ Accessibility Features
- ✅ Advanced Search & Filtering
- ✅ Availability Management
- ✅ Image Management

**Key Features:**
- Pet policy management with detailed pet information
- Accessibility compliance features
- Advanced search with multiple filters
- Availability periods with special pricing
- Comprehensive amenity categorization

### 🔧 **Part 3: Admin Management & Reports**
**File:** `Part_3_Admin_Management_Reports.postman_collection.json`

**Coverage:**
- ✅ Admin User Management
- ✅ Admin Listing Management
- ✅ Admin Booking Management
- ✅ Admin Payment Management
- ✅ Dashboard & Analytics
- ✅ Reports System with Export

**Key Features:**
- Complete admin oversight of all platform operations
- Advanced filtering and bulk operations
- Real-time dashboard with analytics
- Comprehensive reporting with CSV/Excel export
- Critical alerts and monitoring

### 💳 **Part 4: Complete Payment System**
**File:** `Part_4_Complete_Payment_System.postman_collection.json`

**Coverage:**
- ✅ Payment Intent Management
- ✅ Payment Confirmation
- ✅ Refund Management
- ✅ Payment History & Reports
- ✅ Stripe Webhooks
- ✅ Testing Utilities

**Key Features:**
- Stripe integration with payment intents
- Pet fees and deposit management
- Comprehensive refund system
- Webhook handling for payment events
- Testing scenarios with Stripe test cards

### 📅 **Part 5: Complete Booking System**
**File:** `Part_5_Complete_Booking_System.postman_collection.json`

**Coverage:**
- ✅ Booking Creation & Management
- ✅ Search & Availability
- ✅ Booking Retrieval & Details
- ✅ Status Management
- ✅ Check-in & Check-out
- ✅ Admin Booking Operations

**Key Features:**
- Pet-friendly booking support
- Accessibility accommodations
- Advanced booking search and filtering
- Complete check-in/check-out workflow
- Admin booking oversight and management

### 📊 **Enhanced Main Collection**
**File:** `Gharfar.postman_collection.json` (Updated)

**Coverage:**
- ✅ Fixed authentication URLs
- ✅ Updated user management endpoints
- ✅ Complete booking workflow
- ✅ Enhanced amenity system
- ✅ Payment integration

## 🛠️ Setup Instructions

### 1. **Environment Variables**
Create a Postman environment with the following variables:

```json
{
  "baseUrl": "http://localhost:3000",
  "authToken": "",
  "adminToken": "",
  "hostToken": "",
  "guestToken": "",
  "userId": "",
  "adminUserId": "",
  "hostUserId": "",
  "guestUserId": "",
  "listingId": "",
  "bookingId": "",
  "paymentId": "",
  "amenityId": ""
}
```

### 2. **Authentication Flow**
1. **Start with Part 1** - Register users and get tokens
2. **Use the tokens** in subsequent collections
3. **Admin operations** require admin token
4. **Host operations** require host token

### 3. **Collection Order**
Recommended execution order:
1. **Part 1:** Create users and authenticate
2. **Part 2:** Create listings and amenities
3. **Part 5:** Create bookings
4. **Part 4:** Process payments
5. **Part 3:** Admin management and reports

## 🎯 Key Features Covered

### **Enhanced User Management**
- ✅ Last login tracking with device info
- ✅ Session history and activity monitoring
- ✅ Multi-step verification system
- ✅ Permission-based access control
- ✅ Admin user oversight

### **Advanced Booking System**
- ✅ Pet-friendly bookings with detailed pet info
- ✅ Accessibility accommodations
- ✅ Complex pricing with fees and deposits
- ✅ Check-in/check-out workflow
- ✅ Booking status management

### **Comprehensive Payment System**
- ✅ Stripe payment intents
- ✅ Pet fees and deposits
- ✅ Refund management
- ✅ Payment webhooks
- ✅ Testing scenarios

### **Admin Management Suite**
- ✅ Complete platform oversight
- ✅ User, listing, and booking management
- ✅ Payment administration
- ✅ Analytics and reporting
- ✅ Export capabilities

### **Enhanced Amenity System**
- ✅ Categorized amenities
- ✅ Pet-specific amenities
- ✅ Accessibility features
- ✅ Bulk operations
- ✅ Host amenity selection

## 🧪 Testing Guidelines

### **Test Data Preparation**
1. **Users:** Create guest, host, and admin users
2. **Listings:** Create various listing types with different features
3. **Amenities:** Seed amenities using bulk creation
4. **Bookings:** Test different booking scenarios

### **Test Scenarios**
- ✅ Standard booking flow
- ✅ Pet-friendly booking with multiple pets
- ✅ Accessibility booking with special needs
- ✅ Payment processing with various cards
- ✅ Refund scenarios
- ✅ Admin interventions

### **Error Testing**
- ✅ Invalid authentication
- ✅ Permission violations
- ✅ Failed payments
- ✅ Booking conflicts
- ✅ Data validation errors

## 📊 API Coverage Summary

| **Feature** | **Endpoints** | **Status** |
|-------------|---------------|------------|
| Authentication | 15+ | ✅ Complete |
| User Management | 20+ | ✅ Complete |
| Listings | 25+ | ✅ Complete |
| Amenities | 10+ | ✅ Complete |
| Bookings | 30+ | ✅ Complete |
| Payments | 15+ | ✅ Complete |
| Admin Operations | 40+ | ✅ Complete |
| Reports | 10+ | ✅ Complete |
| **TOTAL** | **165+** | **✅ Complete** |

## 🔍 What's New & Enhanced

### **Latest Updates:**
1. **Fixed all authentication URLs** from `/api/auth/*` to `/api/users/*`
2. **Added missing admin management APIs** for bookings and payments
3. **Created comprehensive payment system** with Stripe integration
4. **Enhanced booking system** with pet and accessibility features
5. **Added complete reporting system** with export capabilities
6. **Included admin dashboard APIs** with analytics

### **Missing APIs - Now Included:**
- ✅ Admin booking management
- ✅ Admin payment management  
- ✅ Reports and analytics APIs
- ✅ Dashboard endpoints
- ✅ Export functionalities
- ✅ Webhook handlers
- ✅ Activity logging
- ✅ Bulk operations

## 🚀 Getting Started

1. **Import all collections** into Postman
2. **Set up environment** with base URL
3. **Start with Part 1** to create users
4. **Follow the sequence** to test complete workflows
5. **Use admin collection** for management operations

Your Postman collection suite is now **COMPLETE** with every single API endpoint covered! 🎉

## 📝 Notes

- All collections include **comprehensive test scripts**
- **Environment variables** are automatically managed
- **Error handling** and validation included
- **Human-readable IDs** supported throughout
- **Complete documentation** for each endpoint

**Total API Coverage: 165+ endpoints across 5 comprehensive collections!** 🚀
