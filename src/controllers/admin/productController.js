const { ApiError } = require('../../errorHandler');
const { Product } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for product image uploads
const uploadProductFiles = getMultipleFilesUploader([
  { name: 'productImage', folder: 'product_images', maxCount: 5 }, // Multiple product images (max 5)
]);

// Create Product
const createProduct = async (req, res, next) => {
  let productImagePaths = [];

  try {
    // Handle multiple file uploads
    uploadProductFiles(req, res, async (err) => {
      if (err) {
        console.error('Multer Error:', err);
        return next(new ApiError(err.message, 400));
      }

      const { name, description, categoryId, displayedPrice, actualPrice, status } = req.body;

      // Save file paths if files are uploaded
      if (req.files?.productImage) {
        productImagePaths = req.files.productImage.map(file => `/product_images/${file.filename}`);
      }

      // Create new product
      const product = new Product({
        name,
        description,
        categoryId,
        displayedPrice,
        actualPrice,
        productImage: productImagePaths,
        status,
      });

      await product.save();

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    });
  } catch (error) {
    // Delete uploaded files if an error occurs
    if (productImagePaths.length > 0) {
      await Promise.all(productImagePaths.map(path => deleteFile(path)));
    }
    next(error);
  }
};

// Update Product
const updateProduct = async (req, res, next) => {
  let productImagePaths = [];

  try {
    // Handle multiple file uploads
    uploadProductFiles(req, res, async (err) => {
      if (err) {
        console.error('Multer Error:', err);
        return next(new ApiError(err.message, 400));
      }

      const { id } = req.params;
      const { name, description, categoryId, displayedPrice, actualPrice, status } = req.body;

      // Find the existing product
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        throw new ApiError('Product not found', 404);
      }

      // Save new file paths if files are uploaded
      if (req.files?.productImage) {
        productImagePaths = req.files.productImage.map(file => `/product_images/${file.filename}`);
      }

      // Update the product
      const updateData = {
        name: name || existingProduct.name,
        description: description || existingProduct.description,
        categoryId: categoryId || existingProduct.categoryId,
        displayedPrice: displayedPrice || existingProduct.displayedPrice,
        actualPrice: actualPrice || existingProduct.actualPrice,
        productImage: productImagePaths.length > 0 ? productImagePaths : existingProduct.productImage,
        status: status || existingProduct.status,
      };

      const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

      // Delete old files if new ones are uploaded
      if (req.files?.productImage && existingProduct.productImage.length > 0) {
        await Promise.all(existingProduct.productImage.map(path => deleteFile(path)));
      }

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    });
  } catch (error) {
    // Delete uploaded files if an error occurs
    if (productImagePaths.length > 0) {
      await Promise.all(productImagePaths.map(path => deleteFile(path)));
    }
    next(error);
  }
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
    if (product.productImage.length > 0) {
      await Promise.all(product.productImage.map(path => deleteFile(path)));
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
    const products = await Product.find({}).populate('categoryId');

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

    const product = await Product.findById(id).populate('categoryId');
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
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
};