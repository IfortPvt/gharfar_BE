# Payment System Implementation Guide

## Overview

This document outlines the comprehensive payment system implementation for the Gharfar booking platform. The system provides robust payment processing with Stripe integration, comprehensive logging, availability management, and multi-role access control.

## System Architecture

### Core Components

1. **Payment Model** (`src/models/Payment.js`)
   - Human-readable payment IDs (PAY-YYYYMMDD-XXXXX)
   - Complete transaction tracking
   - Stripe integration fields
   - Breakdown and fee calculation
   - Retry logic with expiration

2. **Payment Logging** (`src/models/PaymentLog.js`)
   - Request/response logging
   - Webhook tracking
   - Error categorization
   - Provider-specific data storage

3. **Booking Logging** (`src/models/BookingLog.js`)
   - Multi-role action tracking
   - Status change monitoring
   - System and user actions
   - Audit trail maintenance

4. **Payment Service** (`src/services/paymentService.js`)
   - Stripe payment processing
   - Availability management
   - Webhook handling
   - Error handling and retry logic

5. **Booking Log Service** (`src/services/bookingLogService.js`)
   - Comprehensive logging utilities
   - Activity tracking
   - Critical issue detection

## API Endpoints

### Payment Operations

#### Create Payment Intent
```
POST /api/payments/bookings/:bookingId/payment-intent
```

**Purpose**: Initialize payment process for a booking
**Authentication**: Required (Guest/Admin)
**Request Body**:
```json
{
  "paymentMethod": "stripe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentId": "PAY-20240115-00001",
    "clientSecret": "pi_xxx_secret_xxx",
    "amount": 15000,
    "currency": "usd",
    "status": "pending"
  }
}
```

#### Confirm Payment
```
POST /api/payments/:paymentId/confirm
```

**Purpose**: Confirm payment after user authorizes
**Authentication**: Required (Guest/Admin)
**Request Body**:
```json
{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx"
}
```

#### Retry Payment
```
POST /api/payments/:paymentId/retry
```

**Purpose**: Retry failed payment with new payment method
**Authentication**: Required (Guest/Admin)
**Request Body**:
```json
{
  "paymentMethodId": "pm_xxx"
}
```

#### Process Refund
```
POST /api/payments/:paymentId/refund
```

**Purpose**: Process refund for completed payment
**Authentication**: Required (Admin/Host)
**Request Body**:
```json
{
  "amount": 5000,
  "reason": "Cancellation due to host unavailability"
}
```

#### Get Payment Status
```
GET /api/payments/:paymentId/status
```

**Purpose**: Get current payment status and details
**Authentication**: Required (Guest/Host/Admin)

#### Get Payment History
```
GET /api/payments/bookings/:bookingId/payments
```

**Purpose**: Get all payments for a specific booking
**Authentication**: Required (Guest/Host/Admin)

#### Get User Payments
```
GET /api/payments/my-payments?page=1&limit=20&status=completed
```

**Purpose**: Get user's payment history with filters
**Authentication**: Required

#### Admin: Get All Payments
```
GET /api/payments/admin/all?status=completed&startDate=2024-01-01&endDate=2024-01-31
```

**Purpose**: Admin overview of all payments with filtering
**Authentication**: Required (Admin only)

#### Stripe Webhook
```
POST /api/payments/webhooks/stripe
```

**Purpose**: Handle Stripe webhook events
**Authentication**: Webhook signature verification
**Special**: Raw body required for signature verification

### Booking Management

#### Host: Update Booking Status
```
PUT /api/bookings/host/:bookingId/status
```

**Purpose**: Host approves/declines booking
**Authentication**: Required (Host)
**Request Body**:
```json
{
  "status": "confirmed",
  "response": "Looking forward to hosting you!"
}
```

#### Admin: Update Booking Status
```
PUT /api/bookings/admin/:bookingId/status
```

**Purpose**: Admin override booking status
**Authentication**: Required (Admin)
**Request Body**:
```json
{
  "status": "cancelled",
  "reason": "Policy violation - inappropriate content",
  "notifyGuest": true,
  "notifyHost": true
}
```

#### Admin: Force Cancel Booking
```
PUT /api/bookings/admin/:bookingId/cancel
```

**Purpose**: Admin cancellation with refund processing
**Authentication**: Required (Admin)
**Request Body**:
```json
{
  "reason": "Emergency cancellation due to safety concerns",
  "refundAmount": 12000,
  "notifyGuest": true,
  "notifyHost": true
}
```

#### Get Booking Logs
```
GET /api/bookings/:bookingId/logs?limit=50
```

**Purpose**: Get activity history for a booking
**Authentication**: Required (Guest/Host/Admin)

#### Admin: Get All Bookings
```
GET /api/bookings/admin/all?status=confirmed&page=1&limit=20
```

**Purpose**: Admin overview with filtering and statistics
**Authentication**: Required (Admin)

#### Admin: Recent Activity
```
GET /api/bookings/admin/activity/recent?hours=24&limit=100
```

**Purpose**: Recent booking activity across the platform
**Authentication**: Required (Admin)

#### Admin: Critical Issues
```
GET /api/bookings/admin/issues/critical?limit=20
```

**Purpose**: High-priority booking issues requiring attention
**Authentication**: Required (Admin)

## Payment Flow

### Standard Payment Process

1. **Guest initiates booking**
   - POST `/api/bookings` creates booking with status "pending"
   - Booking log entry created

2. **Guest initiates payment**
   - POST `/api/payments/bookings/:bookingId/payment-intent`
   - Payment record created with status "pending"
   - Stripe PaymentIntent created
   - Payment log entry for intent creation

3. **Guest confirms payment**
   - POST `/api/payments/:paymentId/confirm`
   - Stripe payment confirmed
   - Payment status updated to "completed"
   - Booking payment status updated
   - Payment log entry for confirmation

4. **Host confirms booking** (if not instant book)
   - PUT `/api/bookings/host/:bookingId/status` with status "confirmed"
   - Availability blocked for booking dates
   - Booking log entry for confirmation
   - Availability log entry for blocking

5. **Check-in process**
   - PUT `/api/bookings/:id/checkin`
   - Booking status updated to "checked-in"
   - Check-in log entry created

### Payment Retry Flow

1. **Payment fails**
   - Webhook updates payment status to "failed"
   - Payment log entry for failure
   - Notification sent to guest

2. **Guest retries payment**
   - POST `/api/payments/:paymentId/retry`
   - New PaymentIntent created
   - Retry attempt logged
   - Payment status updated to "pending"

3. **Payment succeeds**
   - Normal confirmation flow continues

### Refund Flow

1. **Cancellation triggers refund**
   - Host/Admin cancels booking
   - Refund amount calculated based on policy
   - POST `/api/payments/:paymentId/refund` internally

2. **Refund processing**
   - Stripe refund initiated
   - Payment log entry for refund request
   - Availability released
   - Refund status tracked

## Data Models

### Payment Model Fields

```javascript
{
  readableId: "PAY-20240115-00001",
  booking: ObjectId,
  user: ObjectId,
  amount: 15000, // Amount in cents
  currency: "usd",
  status: "completed", // pending, completed, failed, cancelled, refunded, expired
  provider: "stripe",
  providerData: {
    paymentIntentId: "pi_xxx",
    paymentMethodId: "pm_xxx",
    clientSecret: "pi_xxx_secret_xxx"
  },
  breakdown: {
    baseAmount: 12000,
    cleaningFee: 2000,
    serviceFee: 800,
    taxes: 200,
    petFee: 0,
    extraGuestFee: 0,
    specialPricingAdjustment: 0
  },
  paymentMethod: {
    type: "card",
    last4: "4242",
    brand: "visa"
  },
  refundedAmount: 0,
  refunds: [],
  retryCount: 0,
  maxRetries: 3,
  expiresAt: Date,
  metadata: {}
}
```

### Payment Log Fields

```javascript
{
  readableId: "LOG-202401151430-001",
  payment: ObjectId,
  booking: ObjectId,
  action: "payment_intent_created", // Enum of actions
  requestData: {}, // API request data
  responseData: {}, // API response data
  provider: "stripe",
  providerRequestId: "req_xxx",
  status: "success", // success, error, pending
  errorCode: null,
  errorMessage: null,
  processingTime: 150, // milliseconds
  webhookEvent: null,
  systemContext: {
    userAgent: "...",
    ipAddress: "192.168.1.1"
  }
}
```

### Booking Log Fields

```javascript
{
  readableId: "BLG-202401151430-001",
  booking: ObjectId,
  action: "booking_confirmed", // Enum of actions
  previousStatus: "pending",
  newStatus: "confirmed",
  performedBy: {
    user: ObjectId,
    role: "host",
    name: "John Doe"
  },
  details: {
    message: "Booking confirmed by host",
    reason: "Looking forward to hosting you!",
    automaticAction: false,
    additionalInfo: {}
  },
  changes: [
    {
      field: "status",
      oldValue: "pending",
      newValue: "confirmed"
    }
  ],
  systemInfo: {
    userAgent: "...",
    ipAddress: "192.168.1.1"
  },
  severity: "high", // low, medium, high, critical
  tags: ["booking_lifecycle", "confirmation", "host_action"]
}
```

## Availability Management

### Blocking Logic

When a booking is confirmed and payment is completed:
1. Find all availability records for the listing covering booking dates
2. Set `available: false` for those date ranges
3. Create booking log entry for availability blocking
4. Prevent double bookings

### Release Logic

When a booking is cancelled or refunded:
1. Find blocked availability for the booking dates
2. Set `available: true` for those date ranges
3. Create booking log entry for availability release
4. Allow new bookings for those dates

## Error Handling

### Payment Errors

1. **Network Issues**
   - Automatic retry with exponential backoff
   - Payment log entry with error details
   - User notification for manual retry

2. **Card Declined**
   - Payment status set to "failed"
   - Allow guest to retry with different card
   - Log decline reason

3. **Webhook Failures**
   - Retry webhook processing
   - Log webhook errors
   - Manual reconciliation tools for admins

### Booking Errors

1. **Availability Conflicts**
   - Check availability before payment confirmation
   - Release payment hold if unavailable
   - Notify guest of conflict

2. **Host Response Timeout**
   - Auto-decline after configured timeout
   - Process refund if payment captured
   - Release availability

## Security Considerations

### Payment Security

1. **PCI Compliance**
   - No card data stored on servers
   - Use Stripe's secure payment methods
   - Tokenized payment processing

2. **Webhook Verification**
   - Verify Stripe webhook signatures
   - Validate webhook event authenticity
   - Prevent replay attacks

3. **Authentication**
   - Require authentication for all payment endpoints
   - Verify user ownership of bookings/payments
   - Role-based access control

### Data Protection

1. **Logging Sensitivity**
   - Exclude sensitive payment data from logs
   - Encrypt log data at rest
   - Limited log retention periods

2. **Access Control**
   - Multi-role permission system
   - Audit all admin actions
   - Principle of least privilege

## Environment Variables

Required environment variables for payment system:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Database
MONGODB_URI=mongodb://localhost:27017/gharfar

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

# Application
NODE_ENV=development
PORT=5000
```

## Testing

### Test Payment Cards (Stripe)

```javascript
// Successful payments
4242424242424242 // Visa
4000056655665556 // Visa (debit)

// Declined payments
4000000000000002 // Card declined

// Requires authentication
4000002500003155 // 3D Secure required
```

### Test Scenarios

1. **Successful Payment Flow**
   - Create booking → Create payment intent → Confirm payment → Host confirms
   - Verify availability blocking
   - Check all log entries

2. **Payment Retry**
   - Create payment with failing card
   - Retry with successful card
   - Verify retry count and logs

3. **Refund Processing**
   - Complete booking → Cancel → Process refund
   - Verify availability release
   - Check refund status

4. **Admin Operations**
   - Admin status updates
   - Force cancellations
   - Critical issue handling

## Monitoring and Observability

### Key Metrics

1. **Payment Success Rate**
   - Track payment completion rates
   - Monitor retry patterns
   - Identify failure trends

2. **Booking Lifecycle**
   - Time from creation to confirmation
   - Host response times
   - Cancellation rates

3. **Availability Accuracy**
   - Double booking incidents
   - Availability sync issues
   - Block/release timing

### Logging Strategy

1. **Structured Logging**
   - JSON format for all logs
   - Consistent field naming
   - Searchable metadata

2. **Error Aggregation**
   - Group similar errors
   - Alert on error spikes
   - Track error resolution

3. **Performance Monitoring**
   - API response times
   - Database query performance
   - Third-party service latency

This comprehensive payment system provides robust transaction processing, detailed audit trails, and seamless integration with the booking lifecycle while maintaining security and scalability.
