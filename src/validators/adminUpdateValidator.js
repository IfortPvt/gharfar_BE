// Joi schema for admin user update
const Joi = require('joi');

// Admin profile schema for nested validation
const adminProfileSchema = Joi.object({
  adminLevel: Joi.string().valid('standard', 'senior', 'manager', 'superadmin'),
  department: Joi.string().valid('customer_support', 'operations', 'finance', 'marketing', 'technical', 'management'),
  permissions: Joi.object({
    users: Joi.object({
      read: Joi.boolean(),
      create: Joi.boolean(),
      update: Joi.boolean(),
      delete: Joi.boolean(),
      suspend: Joi.boolean()
    }),
    listings: Joi.object({
      read: Joi.boolean(),
      create: Joi.boolean(),
      update: Joi.boolean(),
      delete: Joi.boolean(),
      approve: Joi.boolean()
    }),
    bookings: Joi.object({
      read: Joi.boolean(),
      create: Joi.boolean(),
      update: Joi.boolean(),
      cancel: Joi.boolean(),
      refund: Joi.boolean()
    }),
    payments: Joi.object({
      read: Joi.boolean(),
      refund: Joi.boolean()
    }),
    analytics: Joi.object({
      read: Joi.boolean(),
      export: Joi.boolean()
    }),
    settings: Joi.object({
      read: Joi.boolean(),
      update: Joi.boolean()
    })
  })
});

// Address schema for nested validation
const addressSchema = Joi.object({
  street: Joi.string().max(100),
  city: Joi.string().max(50),
  state: Joi.string().max(50),
  country: Joi.string().max(50),
  zipCode: Joi.string().max(20)
});

// Verification schema for nested validation
const verificationsSchema = Joi.object({
  emailVerified: Joi.boolean(),
  phoneVerified: Joi.boolean(),
  idVerified: Joi.boolean(),
  bankVerified: Joi.boolean()
});

exports.updateUserSchema = Joi.object({
  // Basic user fields
  fullName: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20),
  dateOfBirth: Joi.date().max('now'),
  profilePicture: Joi.string().uri(),
  
  // Address
  address: addressSchema,
  
  // Role and status
  role: Joi.string().valid('guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator'),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned', 'pending_verification'),
  isActive: Joi.boolean(),
  isVerified: Joi.boolean(),
  
  // Verification settings
  verifications: verificationsSchema,
  
  // Legacy permission system (for backward compatibility)
  canLogin: Joi.boolean(),
  canBook: Joi.boolean(),
  canList: Joi.boolean(),
  manageHosts: Joi.boolean(),
  accessUser: Joi.boolean(),
  manageContent: Joi.boolean(),
  deleteListing: Joi.boolean(),
  assignRoles: Joi.boolean(),
  
  // Admin-specific fields
  adminProfile: adminProfileSchema,
  adminNotes: Joi.array().items(
    Joi.object({
      note: Joi.string().required(),
      addedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // ObjectId pattern
      addedAt: Joi.date(),
      priority: Joi.string().valid('low', 'medium', 'high').default('medium')
    })
  ),
  flags: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('suspicious_activity', 'payment_issue', 'policy_violation', 'fake_profile', 'other').required(),
      description: Joi.string(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
      flaggedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // ObjectId pattern
      flaggedAt: Joi.date(),
      resolved: Joi.boolean().default(false),
      resolvedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // ObjectId pattern
      resolvedAt: Joi.date()
    })
  ),
  
  // Other admin-manageable fields
  bio: Joi.string().max(500),
  languages: Joi.array().items(Joi.string()),
  timezone: Joi.string(),
  currency: Joi.string().length(3),
  
  // Social links
  socialLinks: Joi.object({
    facebook: Joi.string().uri(),
    twitter: Joi.string().uri(),
    instagram: Joi.string().uri(),
    linkedin: Joi.string().uri()
  })
});
