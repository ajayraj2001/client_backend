const { ApiError } = require('../../errorHandler');
const { Product } = require('../../models');

// Get All Products
const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .sort({ _id: -1 })
      .populate('categoryId', 'name image');

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: products,
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