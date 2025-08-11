const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  // Joi validation error
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = {
      status: 'error',
      statusCode: 400,
      message: 'Validation Error',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    };
    return res.status(400).json(error);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      status: 'error',
      statusCode: 400,
      message: 'Validation Error',
      details: Object.values(err.errors).map(val => ({
        field: val.path,
        message: val.message,
        value: val.value
      }))
    };
    return res.status(400).json(error);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    // Special handling for the problematic 'id' field
    if (field === 'id' && value === null) {
      console.error('Duplicate null id error details:', {
        error: err,
        keyValue: err.keyValue,
        keyPattern: err.keyPattern,
        index: err.index
      });
      
      error = {
        status: 'error',
        statusCode: 500,
        message: 'Database constraint issue with id field. Please contact support.',
        details: [{
          field: field,
          message: `Database has existing null ${field} constraint issue`,
          value: value,
          technical: 'Existing null id in database causing unique constraint violation'
        }]
      };
    } else {
      error = {
        status: 'error',
        statusCode: 400,
        message: `Duplicate value error`,
        details: [{
          field: field,
          message: `${field} '${value}' already exists`,
          value: value
        }]
      };
    }
    return res.status(error.statusCode).json(error);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = {
      status: 'error',
      statusCode: 400,
      message: 'Invalid data format',
      details: [{
        field: err.path,
        message: `Invalid ${err.kind} format`,
        value: err.value
      }]
    };
    return res.status(400).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      status: 'error',
      statusCode: 401,
      message: 'Invalid token',
      details: []
    };
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      status: 'error',
      statusCode: 401,
      message: 'Token expired',
      details: []
    };
    return res.status(401).json(error);
  }

  // Custom application errors
  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({
      status: 'error',
      statusCode: err.status || err.statusCode,
      message: err.message || 'An error occurred',
      details: err.details || []
    });
  }

  // Default server error
  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    details: []
  });
};

module.exports = errorHandler;
