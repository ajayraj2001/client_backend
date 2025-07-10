const { ApiError } = require('../../errorHandler');
const { Blog } = require('../../models');

const getAllBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim();

        const query = { status: "Active" };

        if (search) {
            const regex = new RegExp(search, 'i');
            query.title = { $regex: regex };
        }

        const [blogs, totalCount] = await Promise.all([
            Blog.find(query)
                .sort({ updated_at: -1, _id: -1 })
                .skip(skip)
                .limit(limit),
            Blog.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return res.status(200).json({
            success: true,
            message: 'Blogs fetched successfully',
            data: blogs,
            pagination: {
                totalItems: totalCount,
                totalPages,
                currentPage: page,
                pageSize: limit,
                hasNextPage: page < totalPages,
            }
        });
    } catch (error) {
        next(error);
    }
};

const getBlogById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) {
            throw new ApiError('Blog not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Blog fetched successfully',
            data: blog,
        });
    } catch (error) {
        next(error);
    }
};

const getActiveBlogBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({ slug, status: 'Active' });
        if (!blog) {
            throw new ApiError('Blog not found or not active', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Active blog fetched successfully',
            data: blog,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllBlogs, getBlogById, getActiveBlogBySlug }