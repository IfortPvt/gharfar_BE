const { body, param } = require('express-validator');

exports.validateAddCalendar = [
  param('id').isMongoId(),
  body('url').isURL(),
  body('provider').optional().isIn(['airbnb','vrbo','booking','other']),
  body('feedToken').optional().isString().isLength({ max: 256 })
];

exports.validateSyncCalendar = [
  param('id').isMongoId(),
  param('calendarId').isMongoId()
];
