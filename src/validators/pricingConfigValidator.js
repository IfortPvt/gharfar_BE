const { body } = require('express-validator');

const feeValidator = (field) => [
  body(`${field}.isFree`).optional().isBoolean(),
  body(`${field}.mode`).optional().isIn(['percentage', 'fixed']),
  body(`${field}.value`).optional().isFloat({ min: 0 })
];

const flatValidator = (field) => [
  body(`${field}.isFree`).optional().isBoolean(),
  body(`${field}.value`).optional().isFloat({ min: 0 })
];

exports.validatePricingConfig = [
  body('enabled').optional().isBoolean(),
  ...feeValidator('serviceFee'),
  ...feeValidator('tax'),
  ...flatValidator('cleaningFee'),
  ...flatValidator('petFeePerNight'),
  ...flatValidator('petDepositPerPet'),
  body('notes').optional().isString().isLength({ max: 500 })
];
