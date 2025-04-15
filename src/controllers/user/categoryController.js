const { ApiError } = require('../../errorHandler');
const { Category } = require('../../models');

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


module.exports = {
    getAllCategories,
    getCategoryById,
};