const { body } = require('express-validator');

exports.validateImages = [
  body('reorder')
    .optional()
    .isArray()
    .withMessage('Reorder must be an array')
    .custom((value) => {
      return value.every(item => 
        item.imageId && 
        item.order !== undefined && 
        typeof item.order === 'number'
      );
    })
    .withMessage('Each reorder item must have imageId and order'),

  body('mainImageId')
    .optional()
    .isMongoId()
    .withMessage('Invalid main image ID'),

  body('featuredImageId')
    .optional()
    .isMongoId()
    .withMessage('Invalid featured image ID'),

  body('newImages')
    .optional()
    .isArray()
    .withMessage('New images must be an array')
    .custom((value) => {
      return value.every(item => item.url);
    })
    .withMessage('Each image must have a URL')
];