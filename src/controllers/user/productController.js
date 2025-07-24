const { ApiError } = require('../../errorHandler');
const { Product, ProductReview } = require('../../models');

// Get All Products
const getAllProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { search } = req.query;

        // Build search filter
        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' }; // case-insensitive search
        }

        const totalCount = await Product.countDocuments(filter);

        const products = await Product.find(filter)
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


const getProductsByCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required',
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim() || '';

        const filter = {
            status: "Active",
            categoryId,
        };

        if (search) {
            filter.name = { $regex: search, $options: 'i' }; // case-insensitive match
        }

        const totalCount = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: 'Products fetched successfully by category',
            productData: products,
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
// const getProductById = async (req, res, next) => {
//     try {
//         const { id } = req.params;

//         const product = await Product.findById(id).populate('categoryId', 'name image');
//         if (!product) {
//             throw new ApiError('Product not found', 404);
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Product fetched successfully',
//             data: product,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id).populate('categoryId', 'name image');
        if (!product) {
            throw new ApiError('Product not found', 404);
        }

        const latestReviews = await ProductReview.find({ productId: id, status: 'Active' })
            .populate('userId', 'name profile_img')
            .sort({ created_at: -1 })
            .limit(5);

        return res.status(200).json({
            success: true,
            message: 'Product fetched successfully',
            data: {
                product,
                latestReviews,
            },
        });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    getAllProducts,
    getProductById,
    getProductsByCategory
};