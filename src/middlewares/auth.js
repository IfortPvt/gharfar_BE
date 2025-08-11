const jwt = require('jsonwebtoken');
const User = require('../models/User');

// General authentication middleware
exports.auth = async (req, res, next) => {
  try {
    console.log('Authorization header:', req.headers.authorization);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. Invalid token format.' 
      });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user and check if they still exist
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found. Token may be invalid.' 
      });
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
      
      return res.status(403).json({ 
        success: false,
        message 
      });
    }
    
    // Check if user has login permission
    if (!user.canLogin) {
      return res.status(403).json({ 
        success: false,
        message: 'Login access has been restricted for this account.' 
      });
    }
    
    // Update last active time
    user.activity = user.activity || {};
    user.activity.lastActiveAt = new Date();
    await user.save();
    
    // Attach user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error.' 
    });
  }
};

// Role-based authorization middleware
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('User role:', req.user.role);
    console.log('Required roles:', roles);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }
    
    next();
  };
};

// Permission-based authorization middleware
exports.authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }
    
    // Superadmin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission => {
      const [category, action] = permission.split('.');
      return req.user.hasPermission(category, action);
    });
    
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required permissions: ${permissions.join(' or ')}` 
      });
    }
    
    next();
  };
};

// Middleware to check if user owns the resource or is admin
exports.authorizeOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }
    
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    const currentUserId = req.user._id.toString();
    
    // Allow if user owns the resource or is admin/superadmin
    if (resourceUserId === currentUserId || 
        ['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. You can only access your own resources.' 
    });
  };
};

// Middleware to check if user is verified
exports.requireVerification = (verificationType = 'email') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }
    
    const verificationField = `${verificationType}Verified`;
    
    if (!req.user.verifications || !req.user.verifications[verificationField]) {
      return res.status(403).json({ 
        success: false,
        message: `${verificationType.charAt(0).toUpperCase() + verificationType.slice(1)} verification required.` 
      });
    }
    
    next();
  };
};

// Middleware to log user actions (for audit trail)
exports.logUserAction = (action) => {
  return (req, res, next) => {
    // This could be enhanced to log to a separate audit collection
    console.log(`User ${req.user._id} (${req.user.email}) performed action: ${action}`);
    
    // You could also add to user's activity log here
    // req.user.activity.actions = req.user.activity.actions || [];
    // req.user.activity.actions.unshift({
    //   action,
    //   timestamp: new Date(),
    //   ip: req.ip,
    //   userAgent: req.headers['user-agent']
    // });
    
    next();
  };
};
