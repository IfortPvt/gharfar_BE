const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findOne({ 
      _id: decoded.userId,
      'tokens.token': token 
    });

    if (!user) {
      throw new Error();
    }

    // Add user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Please authenticate'
    });
  }
};

// Additional middleware for role-based access
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }
    next();
  };
};