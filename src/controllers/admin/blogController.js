const { ApiError } = require('../../errorHandler');
const { Blog } = require('../../models');
const { getFileUploader, deleteFile } = require('../../middlewares');

const generateSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
        const query = { slug: uniqueSlug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const exists = await Blog.findOne(query);
        if (!exists) break;

        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};


// Multer setup for blog image upload
const uploadBlogImage = getFileUploader('featuredImage', 'blog_images');

// Create Blog
const createBlog = async (req, res, next) => {
    uploadBlogImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let blogImgPath = '';

        try {
            const { title, slug, excerpt, author, html, status, tags } = req.body;

            // Check if slug is provided and already exists
            let finalSlug = slug;
            if (slug) {
                const existingSlug = await Blog.findOne({ slug });
                if (existingSlug) {
                    throw new ApiError('Slug already exists. Please choose a different slug.', 400);
                }
            } else {
                const baseSlug = generateSlug(title);
                finalSlug = await ensureUniqueSlug(baseSlug);
            }

            if (req.file) {
                blogImgPath = `/blog_images/${req.file.filename}`;
            }

            let parsedTags = [];
            if (tags) {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            }

            const blog = new Blog({
                title,
                slug: finalSlug,
                excerpt,
                author,
                html,
                status,
                tags: parsedTags,
                featuredImage: blogImgPath,
            });

            await blog.save();

            return res.status(201).json({
                success: true,
                message: 'Blog created successfully',
                data: blog,
            });

        } catch (error) {
            if (blogImgPath) {
                await deleteFile(blogImgPath);
            }
            next(error);
        }
    });
};

// Update Blog
const updateBlog = async (req, res, next) => {
    uploadBlogImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let blogImgPath = '';

        try {
            const { id } = req.params;
            const { title, slug, excerpt, author, html, status, tags } = req.body;

            const existingBlog = await Blog.findById(id);
            if (!existingBlog) {
                throw new ApiError('Blog not found', 404);
            }

            let finalSlug = existingBlog.slug;

            if (slug && slug !== existingBlog.slug) {
                const existingSlug = await Blog.findOne({ slug, _id: { $ne: id } });
                if (existingSlug) {
                    throw new ApiError('Slug already exists. Please choose a different slug.', 400);
                }
                finalSlug = slug;
            }  else if (!slug && title && title !== existingBlog.title) {
                const baseSlug = generateSlug(title);
                finalSlug = await ensureUniqueSlug(baseSlug, id);
            }

            if (req.file) {
                blogImgPath = `/blog_images/${req.file.filename}`;
            }

            // Parse tags if sent as string (from form-data)
            let parsedTags = existingBlog.tags;
            if (tags) {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            }

            const updateData = {
                title: title || existingBlog.title,
                slug: slug || existingBlog.slug, // Allow slug updates
                excerpt: excerpt || existingBlog.excerpt,
                author: author || existingBlog.author,
                html: html || existingBlog.html,
                status: status || existingBlog.status,
                tags: tags ? parsedTags : existingBlog.tags,
                featuredImage: blogImgPath || existingBlog.featuredImage,
            };

            const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

            if (!blog) {
                throw new ApiError('Error updating blog', 500);
            }

            // Delete old image if a new one is uploaded
            if (req.file && existingBlog.featuredImage) {
                await deleteFile(existingBlog.featuredImage);
            }

            return res.status(200).json({
                success: true,
                message: 'Blog updated successfully',
                data: blog,
            });

        } catch (error) {
            if (blogImgPath) {
                await deleteFile(blogImgPath);
            }
            next(error);
        }
    });
};


// Delete Blog
const deleteBlog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findByIdAndDelete(id);
        if (!blog) {
            throw new ApiError('Blog not found', 404);
        }

        if (blog.featuredImage) {
            await deleteFile(blog.featuredImage);
        }

        return res.status(200).json({
            success: true,
            message: 'Blog deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

const getAllBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const { status } = req.query;

        let filter = {};

        if (status && status !== 'All') {
            filter.status = status; // e.g., "Active" or "Inactive"
        }

        const [blogs, totalCount] = await Promise.all([
            Blog.find(filter)
                .sort({ updated_at: -1 })
                .skip(skip)
                .limit(limit),
            Blog.countDocuments(filter)
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


// Get Blog by ID
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

// Get Blog by Slug - NEW API
const getBlogBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({ slug });
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

// Update Blog Status
const updateBlogStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['Active', 'Inactive', 'Draft'].includes(status)) {
            throw new ApiError('Invalid status', 400);
        }

        // Find and update the blog status
        const blog = await Blog.findByIdAndUpdate(id, { status }, { new: true });

        if (!blog) {
            throw new ApiError('Blog not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Blog status updated successfully',
            data: blog,
        });
    } catch (error) {
        next(error);
    }
};

// Get Active Blogs (for public view)
const getActiveBlogs = async (req, res, next) => {
    try {
        const blogs = await Blog.find({ status: 'Active' }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Active blogs fetched successfully',
            data: blogs,
        });
    } catch (error) {
        next(error);
    }
};

// Get Active Blog by Slug (for public view) - NEW API
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

module.exports = {
    createBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    getBlogBySlug, // NEW
    updateBlogStatus,
    getActiveBlogs,
    getActiveBlogBySlug, // NEW
};