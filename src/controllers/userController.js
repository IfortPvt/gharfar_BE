const UserService = require('../services/userService');
const { registerSchema, loginSchema, verifyTokenSchema } = require('../validators/userValidator');

class UserController {
  
  // Authentication endpoints
  static async register(req, res, next) {
    try {
      console.log('Register request body:', req.body);
      
      // Validate request body
      const { error, value } = registerSchema.validate(req.body, { 
        abortEarly: false, // Return all validation errors
        allowUnknown: false, // Don't allow unknown fields
        stripUnknown: true // Remove unknown fields from validated data
      });
      
      if (error) {
        return next(error);
      }
      
      const user = await UserService.register(value);
      res.status(201).json({ 
        success: true,
        message: 'User registered successfully',
        user 
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async login(req, res, next) {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body, { 
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });
      
      if (error) {
        return next(error);
      }
      
      // Extract device info from request
      const deviceInfo = {
        device: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        browser: req.headers['user-agent']?.split(' ')[0],
        location: {
          // Could be enhanced with IP geolocation
          city: req.headers['cf-ipcity'] || 'Unknown',
          country: req.headers['cf-ipcountry'] || 'Unknown'
        }
      };
      
      const result = await UserService.login(value, deviceInfo);
      res.json({
        success: true,
        message: 'Login successful',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async verifyToken(req, res, next) {
    try {
      // Validate request body
      const { error, value } = verifyTokenSchema.validate(req.body, { 
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });
      
      if (error) {
        return next(error);
      }
      
      const authModel = await UserService.verifyToken(value);
      res.json({
        success: true,
        message: 'Token verified successfully',
        data: {
          api_token: authModel.api_token,
          refreshToken: authModel.refreshToken
        },
        user: authModel.user,
        tokenInfo: authModel.tokenInfo
      });
    } catch (err) {
      next(err);
    }
  }
  
  // Profile management endpoints
  static async getProfile(req, res, next) {
    try {
      const user = await UserService.getProfile(req.user._id);
      res.json({
        success: true,
        user
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async updateProfile(req, res, next) {
    try {
      const user = await UserService.updateProfile(req.user._id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async uploadProfilePicture(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      
      const imagePath = `/uploads/profiles/${req.file.filename}`;
      const user = await UserService.updateProfilePicture(req.user._id, imagePath);
      
      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        profileImage: user.profileImage
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }
      
      const result = await UserService.changePassword(req.user._id, currentPassword, newPassword);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async deleteAccount(req, res, next) {
    try {
      const { confirmPassword, reason } = req.body;
      
      if (!confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password confirmation is required'
        });
      }
      
      const result = await UserService.deleteAccount(req.user._id, confirmPassword, reason);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
  
  // User activity and statistics
  static async getUserActivity(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const activity = await UserService.getUserActivity(req.user._id, { page, limit });
      
      res.json({
        success: true,
        activity
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async verifyEmail(req, res, next) {
    try {
      const user = await UserService.verifyEmail(req.user._id);
      res.json({
        success: true,
        message: 'Email verified successfully',
        user
      });
    } catch (err) {
      next(err);
    }
  }
  
  // Public profile endpoints
  static async getPublicProfile(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await UserService.getProfile(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const publicProfile = user.getPublicProfile();
      res.json({
        success: true,
        profile: publicProfile
      });
    } catch (err) {
      next(err);
    }
  }
  
  // Reviews endpoints (placeholders for future implementation)
  static async getUserReviews(req, res, next) {
    try {
      const { type = 'received', page = 1, limit = 10 } = req.query;
      
      // This would integrate with review service when implemented
      res.json({
        success: true,
        message: 'Reviews endpoint - to be implemented with review system',
        reviews: [],
        pagination: {
          current: parseInt(page),
          pages: 0,
          total: 0,
          perPage: parseInt(limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  // Host management endpoints
  static async getHostListings(req, res, next) {
    try {
      // This would integrate with listing service
      res.json({
        success: true,
        message: 'Host listings endpoint - to be implemented with listing system',
        listings: []
      });
    } catch (err) {
      next(err);
    }
  }
  
  static async getHostBookings(req, res, next) {
    try {
      // This would integrate with booking service
      res.json({
        success: true,
        message: 'Host bookings endpoint - to be implemented with booking system',
        bookings: []
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
