/**
 * Sorting middleware for standardizing sort operations
 * Follows Gharfar platform conventions
 */
const sorting = (allowedFieldsOrOptions = ['createdAt'], defaultSort = { createdAt: -1 }) => {
  return (req, res, next) => {
    // Handle both formats: array of fields or options object
    let allowedFields, sortDefault;
    
    if (Array.isArray(allowedFieldsOrOptions)) {
      // Format: sorting(['field1', 'field2'], { field1: -1 })
      allowedFields = allowedFieldsOrOptions;
      sortDefault = defaultSort;
    } else if (typeof allowedFieldsOrOptions === 'object' && allowedFieldsOrOptions.allowedFields) {
      // Format: sorting({ allowedFields: ['field1', 'field2'], defaultSort: { field1: -1 } })
      allowedFields = allowedFieldsOrOptions.allowedFields;
      sortDefault = allowedFieldsOrOptions.defaultSort || defaultSort;
    } else {
      // Fallback
      allowedFields = ['createdAt'];
      sortDefault = { createdAt: -1 };
    }

    const sortBy = req.query.sortBy || Object.keys(sortDefault)[0];
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Validate sort field against allowed fields
    if (!allowedFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`,
        errors: [{
          field: 'sortBy',
          message: `Must be one of: ${allowedFields.join(', ')}`
        }]
      });
    }

    // Attach sorting data to request
    req.sorting = {
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      sort: { [sortBy]: sortOrder }
    };

    next();
  };
};

module.exports = { sorting };
