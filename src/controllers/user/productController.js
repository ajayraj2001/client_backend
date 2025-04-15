const { ApiError } = require('../../errorHandler');
const { Product } = require('../../models');

// Get All Products
const getAllProducts = async (req, res, next) => {
    try {
      // Get page & limit from query, fallback to default if not provided
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
  
      const skip = (page - 1) * limit;
  
      // Total count for frontend pagination UI
      const totalCount = await Product.countDocuments();
  
      const products = await Product.find({})
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name image');
  
      return res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        data: products,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  };
  

// Get Product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('categoryId', 'name image');
    if (!product) {
      throw new ApiError('Product not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
};