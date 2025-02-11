const { ApiError } = require('../../errorHandler');
const { Product } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for product image uploads
const uploadProductFiles = getMultipleFilesUploader([
  { name: 'img', folder: 'product_images', maxCount: 5 }, // Multiple product images (max 5)
]);

// Create Product
const createProduct = async (req, res, next) => {
  uploadProductFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let productImagePaths = [];

    try {
      const { name, description, categoryId, displayedPrice, actualPrice, status, details, } = req.body;

      // Save file paths if files are uploaded
      if (req.files?.img) {
        productImagePaths = req.files.img.map(file => `/product_images/${file.filename}`);
      }

      // Create new product
      const product = new Product({
        name,
        description,
        categoryId,
        displayedPrice,
        actualPrice,
        img: productImagePaths,
        status,
        details: details ? JSON.parse(details) : [], // New key
      });

      await product.save();

      // Populate languages and skills before sending response
      const populatedProduct = await Product.findById(product._id)
        .populate('categoryId', 'name image')

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: populatedProduct,
      });

    } catch (error) {
      if (productImagePaths.length > 0) {
        await Promise.all(productImagePaths.map(path => deleteFile(path)));
      }
      next(error);
    }
  });
};

// Update Product
const updateProduct = async (req, res, next) => {
  uploadProductFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let productImagePaths = [];

    try {
      const { id } = req.params;
      const { name, description, categoryId, displayedPrice, actualPrice, status, details, } = req.body;

      // Find the existing product
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        throw new ApiError('Product not found', 404);
      }

      // Save new file paths if files are uploaded
      if (req.files?.img) {
        productImagePaths = req.files.img.map(file => `/product_images/${file.filename}`);
      }

      // Update the product
      const updateData = {
        name: name || existingProduct.name,
        description: description || existingProduct.description,
        categoryId: categoryId || existingProduct.categoryId,
        displayedPrice: displayedPrice || existingProduct.displayedPrice,
        actualPrice: actualPrice || existingProduct.actualPrice,
        img: productImagePaths.length > 0 ? productImagePaths : existingProduct.img,
        status: status || existingProduct.status,
        details: details ? JSON.parse(details) : existingProduct.details, // New key
      };

      const product = await Product.findByIdAndUpdate(id, updateData, { new: true })
        .populate('categoryId', 'name image')


      if (!product) {
        throw new ApiError('Error updating product', 500);
      }

      // Delete old images if new ones are uploaded
      if (req.files?.img && existingProduct.img.length > 0) {
        await Promise.all(existingProduct.img.map(path => deleteFile(path)));
      }

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });

    } catch (error) {
      if (productImagePaths.length > 0) {
        await Promise.all(productImagePaths.map(path => deleteFile(path)));
      }
      next(error);
    }
  });
};

// Delete Product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the product
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new ApiError('Product not found', 404);
    }

    // Delete associated files
    if (product.img.length > 0) {
      await Promise.all(product.img.map(path => deleteFile(path)));
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

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

const updateProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const product = await Product.findByIdAndUpdate(id, { status }, { new: true });

    if (!product) {
      throw new ApiError('Product not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Product status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductStatus,
};