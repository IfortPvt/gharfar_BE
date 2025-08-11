const { createPaginationResponse, createAggregationPipeline } = require('../middleware/pagination');

/**
 * Base service class with standardized pagination methods
 * Implements business logic patterns for the Gharfar platform
 */
class BaseService {
  /**
   * Standard paginated find with population support
   * @param {Model} Model - Mongoose model
   * @param {Object} filter - MongoDB filter object
   * @param {Object} req - Express request object (contains pagination/sorting)
   * @param {Array} populateOptions - Mongoose populate options
   * @param {String} message - Optional response message
   */
  static async findWithPagination(Model, filter = {}, req, populateOptions = [], message = null, sortOverride = null) {
    const { skip, limit } = req.pagination;
    const { sort } = req.sorting || { sort: { createdAt: -1 } };
    const sortToUse = sortOverride || sort;

    // Execute query and count in parallel for performance
    const [data, totalItems] = await Promise.all([
      Model.find(filter)
        .populate(populateOptions)
        .sort(sortToUse)
        .skip(skip)
        .limit(limit)
        .lean(),
      Model.countDocuments(filter)
    ]);

    return createPaginationResponse(data, totalItems, req, message);
  }

  /**
   * Aggregation with pagination support
   * Optimized for complex queries
   * Accepts either a match stage object (old usage) or a full pipeline array (new usage)
   */
  static async aggregateWithPagination(Model, matchOrPipeline, req, populateOptions = [], message = null) {
    let pipeline;
    if (Array.isArray(matchOrPipeline)) {
      // Full pipeline provided
      const { skip, limit } = req.pagination;
      pipeline = [
        ...matchOrPipeline,
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [ { $count: 'count' } ]
          }
        },
        {
          $project: {
            data: 1,
            totalItems: { $ifNull: [ { $arrayElemAt: ['$totalCount.count', 0] }, 0 ] }
          }
        }
      ];
    } else {
      // Backward compatible: build pipeline from match stage and additional stages
      pipeline = createAggregationPipeline(matchOrPipeline || {}, req, populateOptions || []);
    }

    const result = await Model.aggregate(pipeline);
    const data = result[0]?.data || [];
    const totalItems = result[0]?.totalItems || 0;

    return createPaginationResponse(data, totalItems, req, message);
  }

  /**
   * Search with text indexing and pagination
   * Optimized for search functionality
   */
  static async searchWithPagination(Model, searchQuery, filter = {}, req, populateOptions = [], message = null) {
    const { skip, limit } = req.pagination;
    const { sort } = req.sorting || { sort: { score: { $meta: 'textScore' }, createdAt: -1 } };

    // Combine text search with additional filters
    const combinedFilter = {
      $text: { $search: searchQuery },
      ...filter
    };

    const [data, totalItems] = await Promise.all([
      Model.find(combinedFilter, { score: { $meta: 'textScore' } })
        .populate(populateOptions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Model.countDocuments(combinedFilter)
    ]);

    return createPaginationResponse(data, totalItems, req, message);
  }
}

module.exports = BaseService;
