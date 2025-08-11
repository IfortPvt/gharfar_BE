const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BaseService = require('./baseService');
// Add required models for stats
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

class UserService {
  
  // Register new user
  static async register(userData) {
    const { 
      fullName, 
      email, 
      password, 
      role, 
      phoneNumber, 
      dateOfBirth, 
      gender,
      bio,
      address, 
      preferences,
      hostProfile,
      adminProfile
    } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already in use');
    }
    
    // Create user object
    const userPayload = {
      fullName,
      email,
      password,
      role: role || 'guest',
      phoneNumber,
      dateOfBirth,
      gender,
      bio,
      address,
      preferences
    };
    
    // Add host profile if user is registering as host or landlord
    if (['host', 'landlord'].includes(role) && hostProfile) {
      userPayload.hostProfile = hostProfile;
    }
    
    // Add admin profile if user is registering as admin, superadmin, support, or operator
    if (['admin', 'superadmin', 'support', 'operator'].includes(role) && adminProfile) {
      userPayload.adminProfile = adminProfile;
    }
    
    const user = new User(userPayload);
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return userResponse;
  }
  
  // Login user with activity tracking
  static async login(loginData, deviceInfo = {}) {
    const { email, password } = loginData;
    
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      if (user.status === 'suspended') {
        const suspensionEnd = user.suspensionDetails?.suspensionEndAt;
        if (suspensionEnd && new Date() > suspensionEnd) {
          // Suspension expired, reactivate user
          await user.reactivate();
        } else {
          throw new Error(`Account suspended: ${user.suspensionDetails?.reason || 'Contact support'}`);
        }
      } else {
        throw new Error('Account is not active. Please contact support.');
      }
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login and activity
    await user.updateLastLogin(deviceInfo);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Prepare user response (exclude sensitive data)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorAuth;

    // Attach host stats if applicable (reusable and admin-friendly)
    let stats = userResponse.stats || {
      totalBookings: 0,
      totalListings: 0,
      totalReviews: 0,
      averageRating: 0,
      totalEarnings: 0,
      totalSpent: 0
    };

    if (['host', 'landlord'].includes(user.role)) {
      try {
        stats = await this.getHostStats(user._id);
      } catch (e) {
        // Keep defaults on error, do not block login
        // Optionally log: console.warn('Failed to compute host stats:', e?.message || e);
      }
    } else {
      // For guests, compute totalSpent from successful payments
      try {
        const paymentAgg = await Payment.aggregate([
          { $match: { user: user._id, status: 'succeeded' } },
          { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
        ]);
        stats.totalSpent = paymentAgg[0]?.totalSpent || 0;
      } catch (_) { /* ignore */ }
    }

    userResponse.stats = stats;
    
    return { 
      user: userResponse, 
      token,
      loginTime: new Date(),
      expiresIn: '7d',
      stats // Provide top-level for easy consumption in apps/dashboards
    };
  }
  
  // Verify token and return authentication model
  static async verifyToken(tokenData) {
    const { api_token } = tokenData;
    
    try {
      // Verify the JWT token
      const decoded = jwt.verify(api_token, process.env.JWT_SECRET);
      
      // Find the user and check if they still exist
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        throw new Error('User not found. Token may be invalid.');
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        let message = 'Account is not active.';
        
        if (user.status === 'suspended') {
          const suspensionEnd = user.suspensionDetails?.suspensionEndAt;
          if (suspensionEnd && new Date() > suspensionEnd) {
            // Suspension expired, reactivate user
            await user.reactivate();
          } else {
            message = `Account suspended: ${user.suspensionDetails?.reason || 'Contact support'}`;
          }
        } else if (user.status === 'banned') {
          message = 'Account has been permanently banned.';
        } else if (user.status === 'pending_verification') {
          message = 'Account pending verification. Please check your email.';
        }
        
        throw new Error(message);
      }
      
      // Check if user has login permission
      if (!user.canLogin) {
        throw new Error('Login access has been restricted for this account.');
      }
      
      // Update last active time
      user.activity = user.activity || {};
      user.activity.lastActiveAt = new Date();
      await user.save();
      
      // Generate a new refresh token (optional, for enhanced security)
      const refreshToken = jwt.sign(
        { 
          id: user._id, 
          type: 'refresh' 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
      );
      
      // Return the authentication model
      return {
        api_token: api_token,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          profileImage: user.profileImage,
          verifications: user.verifications
        },
        tokenInfo: {
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000),
          validFor: Math.floor((decoded.exp - Date.now() / 1000) / 3600) + ' hours'
        }
      };
      
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token format or signature.');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired. Please login again.');
      } else {
        throw error;
      }
    }
  }
  
  // Get user profile
  static async getProfile(userId) {
    const user = await User.findById(userId)
      .populate('managedBy', 'fullName email role')
      .populate('managedHosts', 'fullName email role profileImage');
      
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Update user profile
  static async updateProfile(userId, updateData) {
    const allowedUpdates = [
      'fullName', 'phoneNumber', 'dateOfBirth', 'gender', 'bio', 
      'address', 'preferences', 'hostProfile'
    ];
    
    const updates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      userId, 
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Upload profile picture
  static async updateProfilePicture(userId, imagePath) {
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: imagePath },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    
    user.password = newPassword;
    await user.save();
    
    return { message: 'Password updated successfully' };
  }
  
  // Delete user account
  static async deleteAccount(userId, password, reason) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Password confirmation failed');
    }
    
    // Soft delete - mark as inactive
    user.status = 'inactive';
    user.adminNotes.push({
      note: `Account deletion requested by user. Reason: ${reason}`,
      addedBy: userId,
      priority: 'medium'
    });
    
    await user.save();
    
    return { message: 'Account deactivated successfully' };
  }
  
  // Admin: Get all users with filters
  static async getAllUsers(req) {
    try {
      const { 
        role = 'all', 
        status = 'all',
        search = ''
      } = req.query;
      
      const filters = {};
      
      // Apply filters
      if (role !== 'all') {
        filters.role = role;
      }
      
      if (status !== 'all') {
        filters.status = status;
      }
      
      if (search) {
        filters.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const populateOptions = [
        { path: 'managedBy', select: 'fullName email' },
        { path: 'managedHosts', select: 'fullName email role' }
      ];

      const selectFields = '-password'; // Exclude password field

      return BaseService.findWithPagination(
        User,
        filters,
        req,
        populateOptions,
        'Users retrieved successfully',
        undefined, // Use default sorting from middleware
        selectFields
      );
    } catch (error) {
      throw error;
    }
  }
  
  // Admin: Create user
  static async createUser(userData, adminId) {
    const user = await this.register(userData);
    
    // Add admin note
    await User.findByIdAndUpdate(user._id, {
      $push: {
        adminNotes: {
          note: 'User created by admin',
          addedBy: adminId,
          priority: 'low'
        }
      }
    });
    
    return user;
  }
  
  // Admin: Update user
  static async updateUser(userId, updateData, adminId) {
    const allowedAdminUpdates = [
      'fullName', 'email', 'phoneNumber', 'role', 'status', 
      'verifications', 'permissions', 'adminProfile', 'hostProfile'
    ];
    
    const updates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedAdminUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });
    
    // Add admin note for the update
    if (updateData.adminNotes) {
      updates.$push = {
        adminNotes: {
          note: updateData.adminNotes,
          addedBy: adminId,
          priority: 'medium'
        }
      };
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Admin: Suspend user
  static async suspendUser(userId, suspensionData, adminId) {
    const { reason, duration } = suspensionData;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await user.suspend(reason, adminId, duration);
    
    return user;
  }
  
  // Admin: Reactivate user
  static async reactivateUser(userId, adminId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await user.reactivate();
    
    // Add admin note
    user.adminNotes.push({
      note: 'User reactivated by admin',
      addedBy: adminId,
      priority: 'medium'
    });
    
    await user.save();
    
    return user;
  }
  
  // Admin: Get user statistics
  static async getUserStatistics() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          suspendedUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: ['$verifications.emailVerified', 1, 0] }
          }
        }
      }
    ]);
    
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const recentLogins = await User.aggregate([
      {
        $match: {
          'activity.lastLogin': {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      },
      {
        $count: 'recentLogins'
      }
    ]);
    
    return {
      overall: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        verifiedUsers: 0
      },
      byRole: roleStats,
      recentLogins: recentLogins[0]?.recentLogins || 0
    };
  }
  
  // Verify email
  static async verifyEmail(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        'verifications.emailVerified': true,
        'verifications.verifiedAt': new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Get user activity logs
  static async getUserActivity(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(userId)
      .select('activity fullName email')
      .slice('activity.sessionHistory', [skip, limit]);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      activity: user.activity,
      sessionHistory: user.activity.sessionHistory || []
    };
  }

  // Compute and return host stats (reusable for host and admin dashboards)
  static async getHostStats(hostId) {
    const [
      totalListings,
      totalBookingsAgg,
      earningsAgg,
      hostProfile
    ] = await Promise.all([
      Listing.countDocuments({ host: hostId }),
      Booking.aggregate([
        { $match: { host: hostId, status: { $in: ['confirmed', 'checked-in', 'completed'] } } },
        { $group: { _id: null, totalBookings: { $sum: 1 } } }
      ]),
      // Sum successful payment amounts related to this host via booking join
      Payment.aggregate([
        { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'booking' } },
        { $unwind: '$booking' },
        { $match: { status: 'succeeded', 'booking.host': hostId } },
        { $group: { _id: null, totalEarnings: { $sum: '$amount' } } }
      ]),
      User.findById(hostId).select('hostProfile').lean()
    ]);

    const totalBookings = totalBookingsAgg[0]?.totalBookings || 0;
    const totalEarnings = earningsAgg[0]?.totalEarnings || 0;

    // Prefer live review counts if available in hostProfile, else 0
    const totalReviews = hostProfile?.hostProfile?.totalReviews || 0;
    const averageRating = hostProfile?.hostProfile?.averageRating || 0;

    return {
      totalListings,
      totalBookings,
      totalReviews,
      averageRating,
      totalEarnings,
      // totalSpent for host is generally not relevant; keep 0
      totalSpent: 0
    };
  }
}

module.exports = UserService;
