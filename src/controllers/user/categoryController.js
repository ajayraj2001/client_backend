const { ApiError } = require('../../errorHandler');
const { Category } = require('../../models');
const { getFileUploader, deleteFile } = require('../../middlewares');

// Multer setup for category image upload
const uploadCategoryImage = getFileUploader('image', 'category_images');

// Create Category
const createCategory = async (req, res, next) => {
    uploadCategoryImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let categoryImgPath = '';

        try {
            const { name, description, status } = req.body;

            if (req.file) {
                categoryImgPath = `/category_images/${req.file.filename}`;
            }

            const category = new Category({
                name,
                description,
                status,
                image: categoryImgPath,
            });

            await category.save();

            return res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category,
            });

        } catch (error) {
            if (categoryImgPath) {
                await deleteFile(categoryImgPath);
            }
            next(error);
        }
    });
};


// Update Category
const updateCategory = async (req, res, next) => {
    uploadCategoryImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let categoryImgPath = '';

        try {
            const { id } = req.params;
            const { name, description, status } = req.body;

            const existingCategory = await Category.findById(id);
            if (!existingCategory) {
                throw new ApiError('Category not found', 404);
            }

            if (req.file) {
                categoryImgPath = `/category_images/${req.file.filename}`;
            }

            const updateData = {
                name: name || existingCategory.name,
                description: description || existingCategory.description,
                status: status || existingCategory.status,
                image: categoryImgPath || existingCategory.image,
            };

            const category = await Category.findByIdAndUpdate(id, updateData, { new: true });

            if (!category) {
                throw new ApiError('Error updating category', 500);
            }

            // Delete old image if a new one is uploaded
            if (req.file && existingCategory.image) {
                await deleteFile(existingCategory.image);
            }

            return res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: category,
            });

        } catch (error) {
            if (categoryImgPath) {
                await deleteFile(categoryImgPath);
            }
            next(error);
        }
    });
};

// Delete Category
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            throw new ApiError('Category not found', 404);
        }

        if (category.image) {
            await deleteFile(category.image);
        }

        return res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get All Categories
const getAllCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({}).sort({_id:-1})

        return res.status(200).json({
            success: true,
            message: 'Categories fetched successfully',
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

// Get Category by ID
const getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError('Category not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Category fetched successfully',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const updateCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const category = await Category.findByIdAndUpdate(id, { status }, { new: true });

    if (!category) {
      throw new ApiError('Category not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Category status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
    createCategory,
    updateCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById,
    updateCategoryStatus,
};