// Joi schema for admin user creation
const Joi = require('joi');

// Admin permissions schema matching the User model
const adminPermissionsSchema = Joi.object({
  users: Joi.object({
    read: Joi.boolean().default(false),
    create: Joi.boolean().default(false),
    update: Joi.boolean().default(false),
    delete: Joi.boolean().default(false),
    suspend: Joi.boolean().default(false)
  }).optional(),
  listings: Joi.object({
    read: Joi.boolean().default(false),
    create: Joi.boolean().default(false),
    update: Joi.boolean().default(false),
    delete: Joi.boolean().default(false),
    approve: Joi.boolean().default(false)
  }).optional(),
  bookings: Joi.object({
    read: Joi.boolean().default(false),
    create: Joi.boolean().default(false),
    update: Joi.boolean().default(false),
    cancel: Joi.boolean().default(false),
    refund: Joi.boolean().default(false)
  }).optional(),
  payments: Joi.object({
    read: Joi.boolean().default(false),
    refund: Joi.boolean().default(false),
    dispute: Joi.boolean().default(false)
  }).optional(),
  reports: Joi.object({
    view: Joi.boolean().default(false),
    export: Joi.boolean().default(false),
    financial: Joi.boolean().default(false)
  }).optional(),
  system: Joi.object({
    settings: Joi.boolean().default(false),
    maintenance: Joi.boolean().default(false),
    logs: Joi.boolean().default(false)
  }).optional()
});

// Admin profile schema matching the User model
const adminProfileSchema = Joi.object({
  adminLevel: Joi.string().valid('standard', 'senior', 'manager', 'superadmin').default('standard'),
  department: Joi.string().valid('customer_support', 'operations', 'finance', 'marketing', 'technical', 'management').optional(),
  permissions: adminPermissionsSchema.optional(),
  managedRegions: Joi.array().items(Joi.string()).optional(),
  accessLevel: Joi.number().integer().min(1).max(10).default(1)
});

// Host profile schema
const hostProfileSchema = Joi.object({
  description: Joi.string().max(1000).optional(),
  languagesSpoken: Joi.array().items(Joi.string()).optional(),
  responseTime: Joi.string().valid('within an hour', 'within a few hours', 'within a day', 'a few days or more').optional(),
  hostingExperience: Joi.string().optional(),
  policies: Joi.object({
    checkInTime: Joi.string().optional(),
    checkOutTime: Joi.string().optional(),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict', 'super_strict_30', 'super_strict_60').optional(),
    houseRules: Joi.array().items(Joi.string()).optional(),
    instantBooking: Joi.boolean().optional(),
    minimumStay: Joi.number().integer().min(1).optional(),
    maximumStay: Joi.number().integer().min(1).max(365).optional()
  }).optional()
});

exports.createUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator').required(),
  phoneNumber: Joi.string().optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  bio: Joi.string().max(500).optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional()
  }).optional(),
  preferences: Joi.object({
    currency: Joi.string().length(3).uppercase().default('USD'),
    language: Joi.string().length(2).lowercase().default('en'),
    timezone: Joi.string().default('UTC'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      sms: Joi.boolean().default(false),
      push: Joi.boolean().default(true),
      marketing: Joi.boolean().default(true)
    }).optional(),
    privacy: Joi.object({
      showProfile: Joi.boolean().default(true),
      showReviews: Joi.boolean().default(true),
      showListings: Joi.boolean().default(true)
    }).optional()
  }).optional(),
  hostProfile: hostProfileSchema.when('role', {
    is: Joi.string().valid('host', 'landlord'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  adminProfile: adminProfileSchema.when('role', {
    is: Joi.string().valid('admin', 'superadmin', 'support', 'operator'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  adminNotes: Joi.string().optional()
});
