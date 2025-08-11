const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// Sub-schemas for better organization
const addressSchema = new Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { _id: false });

const verificationSchema = new Schema({
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  idVerified: { type: Boolean, default: false },
  backgroundCheckVerified: { type: Boolean, default: false },
  governmentIdVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const preferencesSchema = new Schema({
  currency: { type: String, default: 'USD' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    marketing: { type: Boolean, default: true }
  },
  privacy: {
    showProfile: { type: Boolean, default: true },
    showReviews: { type: Boolean, default: true },
    showListings: { type: Boolean, default: true }
  }
}, { _id: false });

const hostProfileSchema = new Schema({
  description: { type: String, maxlength: 1000 },
  languagesSpoken: [{ type: String }],
  responseTime: { 
    type: String, 
    enum: ['within an hour', 'within a few hours', 'within a day', 'a few days or more'],
    default: 'within a day'
  },
  hostingExperience: { type: String },
  isSuperhost: { type: Boolean, default: false },
  superhostSince: { type: Date },
  responseRate: { type: Number, min: 0, max: 100, default: 0 },
  acceptanceRate: { type: Number, min: 0, max: 100, default: 0 },
  totalReviews: { type: Number, default: 0 },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  verifications: verificationSchema,
  policies: {
    checkInTime: { type: String, default: '3:00 PM - 9:00 PM' },
    checkOutTime: { type: String, default: '11:00 AM' },
    cancellationPolicy: { 
      type: String, 
      enum: ['flexible', 'moderate', 'strict', 'super_strict_30', 'super_strict_60'],
      default: 'moderate'
    },
    houseRules: [{ type: String }],
    instantBooking: { type: Boolean, default: false },
    minimumStay: { type: Number, default: 1 },
    maximumStay: { type: Number, default: 365 }
  }
}, { _id: false });

const adminProfileSchema = new Schema({
  adminLevel: { 
    type: String, 
    enum: ['standard', 'senior', 'manager', 'superadmin'],
    default: 'standard'
  },
  department: { 
    type: String,
    enum: ['customer_support', 'operations', 'finance', 'marketing', 'technical', 'management']
  },
  permissions: {
    users: {
      read: { type: Boolean },
      create: { type: Boolean },
      update: { type: Boolean },
      delete: { type: Boolean },
      suspend: { type: Boolean }
    },
    listings: {
      read: { type: Boolean },
      create: { type: Boolean },
      update: { type: Boolean },
      delete: { type: Boolean },
      approve: { type: Boolean }
    },
    bookings: {
      read: { type: Boolean },
      create: { type: Boolean },
      update: { type: Boolean },
      cancel: { type: Boolean },
      refund: { type: Boolean }
    },
    payments: {
      read: { type: Boolean },
      refund: { type: Boolean },
      dispute: { type: Boolean }
    },
    reports: {
      view: { type: Boolean },
      export: { type: Boolean },
      financial: { type: Boolean }
    },
    system: {
      settings: { type: Boolean },
      maintenance: { type: Boolean },
      logs: { type: Boolean }
    }
  },
  managedRegions: [{ type: String }],
  accessLevel: { type: Number, min: 1, max: 10, default: 1 }
}, { _id: false });

const activitySchema = new Schema({
  lastLogin: { type: Date },
  lastActiveAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  deviceInfo: {
    lastDevice: { type: String },
    lastBrowser: { type: String },
    lastIP: { type: String },
    lastLocation: {
      city: { type: String },
      country: { type: String }
    }
  },
  sessionHistory: [{
    loginAt: { type: Date },
    logoutAt: { type: Date },
    device: { type: String },
    ip: { type: String },
    duration: { type: Number } // in minutes
  }]
}, { _id: false });

const userSchema = new Schema({
  // Basic Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include in queries by default
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || (new Date().getFullYear() - value.getFullYear()) >= 18;
      },
      message: 'User must be at least 18 years old'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Images and Media
  profileImage: {
    type: String // URL to image
  },
  coverImage: {
    type: String // URL to cover image
  },
  
  // Address Information
  address: addressSchema,
  
  // Role and Status
  role: {
    type: String,
    enum: {
      values: ['guest', 'host', 'landlord', 'admin', 'superadmin', 'support', 'operator'],
      message: 'Invalid role specified'
    },
    default: 'guest',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'banned', 'pending_verification'],
    default: 'active'
  },
  suspensionDetails: {
    reason: { type: String },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: { type: Date },
    suspensionEndAt: { type: Date },
    canAppeal: { type: Boolean, default: true }
  },
  
  // Relationships
  listings: [{
    type: Schema.Types.ObjectId,
    ref: 'Listing'
  }],
  bookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  managedHosts: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  managedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User' // For hosts managed by landlords
  },
  
  // Verification and Security
  verifications: verificationSchema,
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, select: false },
    backupCodes: [{ type: String, select: false }]
  },
  
  // Profile-specific data
  hostProfile: {
    type: hostProfileSchema,
    default: undefined
  },
  adminProfile: {
    type: adminProfileSchema,
    default: undefined
  },
  
  // User Preferences
  preferences: {
    type: preferencesSchema,
    default: () => ({})
  },
  
  // Activity Tracking
  activity: {
    type: activitySchema,
    default: () => ({})
  },
  
  // Financial Information
  paymentMethods: [{
    type: { type: String, enum: ['card', 'bank', 'paypal'] },
    isDefault: { type: Boolean, default: false },
    last4: { type: String },
    brand: { type: String },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
    stripePaymentMethodId: { type: String }
  }],
  payoutMethods: [{
    type: { type: String, enum: ['bank', 'paypal'] },
    isDefault: { type: Boolean, default: false },
    last4: { type: String },
    bankName: { type: String },
    accountHolderName: { type: String },
    stripeAccountId: { type: String }
  }],
  
  // Statistics
  stats: {
    totalBookings: { type: Number, default: 0 },
    totalListings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  
  // Admin Notes and Flags
  adminNotes: [{
    note: { type: String },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }],
  flags: [{
    type: { type: String, enum: ['suspicious_activity', 'payment_issue', 'policy_violation', 'fake_profile', 'other'] },
    description: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    flaggedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    flaggedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date }
  }],
  
  // Legacy Permission System (kept for backward compatibility)
  canLogin: { type: Boolean, default: true },
  canBook: { type: Boolean, default: true },
  canList: { type: Boolean, default: false },
  manageHosts: { type: Boolean, default: false },
  accessUser: { type: Boolean, default: false },
  manageContent: { type: Boolean, default: false },
  deleteListing: { type: Boolean, default: false },
  assignRoles: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false // Disable the virtual id getter
});

// Indexes for better query performance and data integrity
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'activity.lastLogin': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'verifications.emailVerified': 1 });

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, country, zipCode } = this.address;
  return [street, city, state, country, zipCode].filter(Boolean).join(', ');
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return new Date().getFullYear() - this.dateOfBirth.getFullYear();
});

// Virtual for account verification status
userSchema.virtual('isFullyVerified').get(function() {
  if (!this.verifications) return false;
  return this.verifications.emailVerified && 
         this.verifications.phoneVerified && 
         this.verifications.idVerified;
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for role-based profile setup
userSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set role-based permissions
    this.setRolePermissions();
    
    // Initialize role-specific profiles
    if (this.role === 'host' || this.role === 'landlord') {
      if (!this.hostProfile) {
        this.hostProfile = {};
      }
      this.canList = true;
    }
    
    if (this.role === 'admin' || this.role === 'superadmin') {
      if (!this.adminProfile) {
        this.adminProfile = {
          adminLevel: this.role === 'superadmin' ? 'superadmin' : 'standard'
        };
      } else {
        // If adminProfile was provided, ensure adminLevel matches role
        if (this.role === 'superadmin' && !this.adminProfile.adminLevel) {
          this.adminProfile.adminLevel = 'superadmin';
        } else if (this.role === 'admin' && !this.adminProfile.adminLevel) {
          this.adminProfile.adminLevel = 'standard';
        }
      }
      
      // Set default permissions if not provided
      if (!this.adminProfile.permissions) {
        this.adminProfile.permissions = {};
      }
      
      // Initialize each permission category with defaults if not provided
      const permissionCategories = ['users', 'listings', 'bookings', 'payments', 'reports', 'system'];
      permissionCategories.forEach(category => {
        if (!this.adminProfile.permissions[category]) {
          this.adminProfile.permissions[category] = {};
        }
        
        // Set default permissions based on admin level
        const permissions = this.adminProfile.permissions[category];
        const isSuper = this.role === 'superadmin' || this.adminProfile.adminLevel === 'superadmin';
        
        // Only set defaults if values are not explicitly provided
        if (category === 'users') {
          if (permissions.read === undefined) permissions.read = isSuper;
          if (permissions.create === undefined) permissions.create = isSuper;
          if (permissions.update === undefined) permissions.update = isSuper;
          if (permissions.delete === undefined) permissions.delete = isSuper;
          if (permissions.suspend === undefined) permissions.suspend = isSuper;
        } else if (category === 'listings') {
          if (permissions.read === undefined) permissions.read = isSuper;
          if (permissions.create === undefined) permissions.create = isSuper;
          if (permissions.update === undefined) permissions.update = isSuper;
          if (permissions.delete === undefined) permissions.delete = isSuper;
          if (permissions.approve === undefined) permissions.approve = isSuper;
        } else if (category === 'bookings') {
          if (permissions.read === undefined) permissions.read = isSuper;
          if (permissions.create === undefined) permissions.create = false;
          if (permissions.update === undefined) permissions.update = isSuper;
          if (permissions.cancel === undefined) permissions.cancel = isSuper;
          if (permissions.refund === undefined) permissions.refund = isSuper;
        } else if (category === 'payments') {
          if (permissions.read === undefined) permissions.read = isSuper;
          if (permissions.refund === undefined) permissions.refund = isSuper;
          if (permissions.dispute === undefined) permissions.dispute = isSuper;
        } else if (category === 'reports') {
          if (permissions.view === undefined) permissions.view = isSuper;
          if (permissions.export === undefined) permissions.export = isSuper;
          if (permissions.financial === undefined) permissions.financial = isSuper;
        } else if (category === 'system') {
          if (permissions.settings === undefined) permissions.settings = isSuper;
          if (permissions.maintenance === undefined) permissions.maintenance = isSuper;
          if (permissions.logs === undefined) permissions.logs = isSuper;
        }
      });
    }
    
    // Initialize activity tracking
    if (!this.activity) {
      this.activity = {};
    }
  }
  
  next();
});

// Method to set permissions based on role
userSchema.methods.setRolePermissions = function() {
  // Reset all permissions first
  this.canLogin = true;
  this.canBook = false;
  this.canList = false;
  this.manageHosts = false;
  this.accessUser = false;
  this.manageContent = false;
  this.deleteListing = false;
  this.assignRoles = false;
  
  switch (this.role) {
    case 'guest':
      this.canBook = true;
      break;
      
    case 'host':
    case 'operator':
      this.canBook = true;
      this.canList = true;
      break;
      
    case 'landlord':
      this.canBook = true;
      this.canList = true;
      this.manageHosts = true;
      break;
      
    case 'support':
      this.manageContent = true;
      this.accessUser = true;
      break;
      
    case 'admin':
      this.canBook = true;
      this.canList = true;
      this.manageHosts = true;
      this.accessUser = true;
      this.manageContent = true;
      this.deleteListing = true;
      break;
      
    case 'superadmin':
      this.canBook = true;
      this.canList = true;
      this.manageHosts = true;
      this.accessUser = true;
      this.manageContent = true;
      this.deleteListing = true;
      this.assignRoles = true;
      break;
  }
};

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
userSchema.methods.updateLastLogin = function(deviceInfo = {}) {
  const now = new Date();
  
  if (!this.activity) {
    this.activity = {};
  }
  
  // Update basic login info
  this.activity.lastLogin = now;
  this.activity.lastActiveAt = now;
  this.activity.loginCount = (this.activity.loginCount || 0) + 1;
  
  // Update device info if provided
  if (deviceInfo) {
    this.activity.deviceInfo = {
      ...this.activity.deviceInfo,
      ...deviceInfo,
      lastDevice: deviceInfo.device || this.activity.deviceInfo?.lastDevice,
      lastBrowser: deviceInfo.browser || this.activity.deviceInfo?.lastBrowser,
      lastIP: deviceInfo.ip || this.activity.deviceInfo?.lastIP,
      lastLocation: deviceInfo.location || this.activity.deviceInfo?.lastLocation
    };
  }
  
  // Add to session history (keep last 10 sessions)
  if (!this.activity.sessionHistory) {
    this.activity.sessionHistory = [];
  }
  
  this.activity.sessionHistory.unshift({
    loginAt: now,
    device: deviceInfo.device,
    ip: deviceInfo.ip,
    duration: 0 // Will be updated on logout
  });
  
  // Keep only last 10 sessions
  if (this.activity.sessionHistory.length > 10) {
    this.activity.sessionHistory = this.activity.sessionHistory.slice(0, 10);
  }
  
  return this.save();
};

// Method to check if user has specific permission
userSchema.methods.hasPermission = function(category, action) {
  if (this.role === 'superadmin') return true;
  
  if (this.adminProfile && this.adminProfile.permissions) {
    const categoryPerms = this.adminProfile.permissions[category];
    if (categoryPerms && categoryPerms[action]) {
      return true;
    }
  }
  
  // Fallback to legacy permissions
  const permissionMap = {
    'users.read': this.accessUser,
    'users.create': this.assignRoles,
    'users.update': this.accessUser,
    'users.delete': this.assignRoles,
    'listings.read': this.canList || this.accessUser,
    'listings.create': this.canList,
    'listings.update': this.canList || this.manageContent,
    'listings.delete': this.deleteListing,
    'bookings.read': this.canBook || this.accessUser,
    'bookings.create': this.canBook,
    'bookings.update': this.accessUser,
    'content.manage': this.manageContent
  };
  
  const key = `${category}.${action}`;
  return permissionMap[key] || false;
};

// Method to get user's public profile
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    fullName: this.fullName,
    profileImage: this.profileImage,
    role: this.role,
    hostProfile: this.role === 'host' ? {
      description: this.hostProfile?.description,
      languagesSpoken: this.hostProfile?.languagesSpoken,
      responseTime: this.hostProfile?.responseTime,
      isSuperhost: this.hostProfile?.isSuperhost,
      totalReviews: this.hostProfile?.totalReviews,
      averageRating: this.hostProfile?.averageRating,
      verifications: this.hostProfile?.verifications
    } : undefined,
    stats: this.stats,
    verifications: {
      emailVerified: this.verifications?.emailVerified || false,
      phoneVerified: this.verifications?.phoneVerified || false,
      idVerified: this.verifications?.idVerified || false
    },
    createdAt: this.createdAt
  };
};

// Method to suspend user
userSchema.methods.suspend = function(reason, suspendedBy, duration = null) {
  this.status = 'suspended';
  this.suspensionDetails = {
    reason,
    suspendedBy,
    suspendedAt: new Date(),
    suspensionEndAt: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
    canAppeal: true
  };
  return this.save();
};

// Method to reactivate user
userSchema.methods.reactivate = function() {
  this.status = 'active';
  this.suspensionDetails = undefined;
  return this.save();
};

// Static method to find by role with pagination
userSchema.statics.findByRole = function(role, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;
  
  const query = role === 'all' ? {} : { role };
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  return this.find(query)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('managedBy', 'fullName email')
    .populate('managedHosts', 'fullName email role');
};

module.exports = mongoose.model('User', userSchema);
