/**
 * Pagination middleware for standardizing pagination across all APIs
 * Follows modern Express.js best practices for the Gharfar platform
 */
const pagination = (defaultLimit = 10, maxLimit = 100) => {
  return (req, res, next) => {
    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit) || defaultLimit), 
      maxLimit
    );
    const skip = (page - 1) * limit;

    // Attach pagination data to request
    req.pagination = {
      page,
      limit,
      skip,
      maxLimit
    };

    next();
  };
};

/**
 * Helper function to create standardized pagination response
 * Ensures consistent API responses across the Gharfar platform
 */
const createPaginationResponse = (data, totalItems, req, message = null) => {
  const page = req?.pagination?.page || 1;
  const limit = req?.pagination?.limit || (Array.isArray(data) ? data.length : 0) || 10;
  const totalPages = limit > 0 ? Math.ceil((totalItems || 0) / limit) : 0;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const safeData = Array.isArray(data) ? data : [];

  const response = {
    success: true,
    data: safeData,
    // Backward-compatible aliases
    listings: safeData,
    count: safeData.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalItems || 0,
      itemsPerPage: limit,
      hasNextPage: hasNext,
      hasPrevPage: hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    }
  };

  if (message) {
    response.message = message;
  }

  return response;
};

/**
 * MongoDB aggregation pipeline helper for pagination
 * Optimized for large datasets
 */
const createAggregationPipeline = (matchStage, req, additionalStages = []) => {
  const { skip, limit } = req.pagination;

  return [
    { $match: matchStage },
    ...additionalStages,
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    },
    {
      $project: {
        data: 1,
        totalItems: { $ifNull: [ { $arrayElemAt: ['$totalCount.count', 0] }, 0 ] }
      }
    }
  ];
};

module.exports = {
  pagination,
  createPaginationResponse,
  createAggregationPipeline
};
