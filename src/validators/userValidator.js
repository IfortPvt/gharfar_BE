const Joi = require('joi');

// Address schema
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200),
  city: Joi.string().trim().max(100),
  state: Joi.string().trim().max(100),
  country: Joi.string().trim().max(100),
  zipCode: Joi.string().trim().max(20),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  })
});

// Preferences schema
const preferencesSchema = Joi.object({
  currency: Joi.string().length(3).uppercase().default('USD'),
  language: Joi.string().length(2).lowercase().default('en'),
  timezone: Joi.string().default('UTC'),
  notifications: Joi.object({
    email: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
    push: Joi.boolean().default(true),
    marketing: Joi.boolean().default(true)
  }),
  privacy: Joi.object({
    showProfile: Joi.boolean().default(true),
    showReviews: Joi.boolean().default(true),
    showListings: Joi.boolean().default(true)
  })
});

// Host profile schema
const hostProfileSchema = Joi.object({
  description: Joi.string().max(1000),
  languagesSpoken: Joi.array().items(Joi.string().max(50)),
  responseTime: Joi.string().valid('within an hour', 'within a few hours', 'within a day', 'a few days or more'),
  hostingExperience: Joi.string().max(200),
  policies: Joi.object({
    checkInTime: Joi.string().max(50),
    checkOutTime: Joi.string().max(50),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict', 'super_strict_30', 'super_strict_60'),
    houseRules: Joi.array().items(Joi.string().max(200)),
    instantBooking: Joi.boolean(),
    minimumStay: Joi.number().integer().min(1),
    maximumStay: Joi.number().integer().min(1).max(365)
  })
});

// Registration schema
exports.registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim().required()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required'
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string().min(8).max(128).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string().valid('guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator')
    .default('guest'),
  
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20).optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  dateOfBirth: Joi.date().max('now').optional().custom((value, helpers) => {
    if (value) {
      const age = new Date().getFullYear() - value.getFullYear();
      if (age < 18) {
        return helpers.error('any.custom', { message: 'You must be at least 18 years old' });
      }
    }
    return value;
  }),
  
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  
  bio: Joi.string().max(500).optional(),
  
  address: addressSchema.optional(),
  
  preferences: preferencesSchema.optional(),
  
  hostProfile: hostProfileSchema.optional()
});

// Login schema
exports.loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string().required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Verify token schema
exports.verifyTokenSchema = Joi.object({
  api_token: Joi.string().required()
    .messages({
      'any.required': 'API token is required',
      'string.empty': 'API token cannot be empty'
    })
});

// Profile update schema
exports.updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20),
  dateOfBirth: Joi.date().max('now').custom((value, helpers) => {
    const age = new Date().getFullYear() - value.getFullYear();
    if (age < 18) {
      return helpers.error('any.custom', { message: 'You must be at least 18 years old' });
    }
    return value;
  }),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
  bio: Joi.string().max(500),
  address: addressSchema,
  preferences: preferencesSchema,
  hostProfile: hostProfileSchema
});

// Password change schema
exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required'
    })
});

// Account deletion schema
exports.deleteAccountSchema = Joi.object({
  confirmPassword: Joi.string().required()
    .messages({
      'any.required': 'Password confirmation is required'
    }),
  
  reason: Joi.string().max(500)
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

// Admin user creation schema
exports.adminCreateUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator').required(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20),
  dateOfBirth: Joi.date().max('now'),
  address: addressSchema,
  adminNotes: Joi.string().max(1000),
  
  // Admin can set initial verification status
  verifications: Joi.object({
    emailVerified: Joi.boolean(),
    phoneVerified: Joi.boolean(),
    idVerified: Joi.boolean()
  }),
  
  // Admin can set permissions
  permissions: Joi.object({
    canLogin: Joi.boolean(),
    canBook: Joi.boolean(),
    canList: Joi.boolean(),
    manageHosts: Joi.boolean(),
    accessUser: Joi.boolean(),
    manageContent: Joi.boolean(),
    deleteListing: Joi.boolean(),
    assignRoles: Joi.boolean()
  })
});

// Admin user update schema
exports.adminUpdateUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim(),
  email: Joi.string().email(),
  role: Joi.string().valid('guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator'),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned', 'pending_verification'),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20),
  
  verifications: Joi.object({
    emailVerified: Joi.boolean(),
    phoneVerified: Joi.boolean(),
    idVerified: Joi.boolean(),
    backgroundCheckVerified: Joi.boolean(),
    governmentIdVerified: Joi.boolean()
  }),
  
  permissions: Joi.object({
    canLogin: Joi.boolean(),
    canBook: Joi.boolean(),
    canList: Joi.boolean(),
    manageHosts: Joi.boolean(),
    accessUser: Joi.boolean(),
    manageContent: Joi.boolean(),
    deleteListing: Joi.boolean(),
    assignRoles: Joi.boolean()
  }),
  
  adminNotes: Joi.string().max(1000)
});

// User suspension schema
exports.suspendUserSchema = Joi.object({
  reason: Joi.string().max(500).required()
    .messages({
      'any.required': 'Suspension reason is required'
    }),
  
  duration: Joi.number().integer().min(1).max(365)
    .messages({
      'number.min': 'Suspension duration must be at least 1 day',
      'number.max': 'Suspension duration cannot exceed 365 days'
    })
});

// User flag schema
exports.flagUserSchema = Joi.object({
  type: Joi.string().valid('suspicious_activity', 'payment_issue', 'policy_violation', 'fake_profile', 'other').required(),
  description: Joi.string().max(1000).required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
});

// Add note schema
exports.addNoteSchema = Joi.object({
  note: Joi.string().max(1000).required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium')
});
