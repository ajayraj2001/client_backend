const { ApiError } = require('../../errorHandler');
const { Blog } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for multiple file uploads
const uploadBlogFiles = getMultipleFilesUploader([
    { name: 'img', folder: 'blog_images' }, // Save blog images in 'blog_images' folder
    { name: 'icon', folder: 'blog_icons' }, // Save blog icons in 'blog_icons' folder
]);

const createBlog = async (req, res, next) => {
    let imgPath = '', iconPath = '';

    try {
        // Handle multiple file uploads
        uploadBlogFiles(req, res, async (err) => {
            if (err) {
                console.error('Multer Error:', err); // Log Multer errors
                return next(new ApiError(err.message, 400));
            }

            const { title, description, author, status } = req.body;

            // Save file paths if files are uploaded
            if (req.files?.img) {
                imgPath = `/blog_images/${req.files.img[0].filename}`;
            }
            if (req.files?.icon) {
                iconPath = `/blog_icons/${req.files.icon[0].filename}`;
            }

            // Create new blog
            const blog = new Blog({
                title,
                description,
                author,
                img: imgPath || '', // Save file path or empty string
                icon: iconPath || '', // Save file path or empty string
                status,
            });

            await blog.save();

            return res.status(201).json({
                success: true,
                message: 'Blog created successfully',
                data: blog,
            });
        });
    } catch (error) {
        // Delete uploaded files if an error occurs
        if (imgPath) await deleteFile(imgPath);
        if (iconPath) await deleteFile(iconPath);

        next(error);
    }
};

const updateBlog = async (req, res, next) => {
    let imgPath = '', iconPath = '';

    try {
        // Handle multiple file uploads
        uploadBlogFiles(req, res, async (err) => {
            if (err) {
                console.error('Multer Error:', err); // Log Multer errors
                return next(new ApiError(err.message, 400));
            }
            
            const { id } = req.params;
            const { title, description, author, status } = req.body;

            // Find the existing blog
            const existingBlog = await Blog.findById(id);
            if (!existingBlog) {
                throw new ApiError('Blog not found', 404);
            }

            // Save new file paths if files are uploaded
            if (req.files?.img) {
                imgPath = `/blog_images/${req.files.img[0].filename}`;
            }
            if (req.files?.icon) {
                iconPath = `/blog_icons/${req.files.icon[0].filename}`;
            }

            // Update the blog
            const updateData = {
                title: title || existingBlog.title,
                description: description || existingBlog.description,
                author: author || existingBlog.author,
                img: imgPath || existingBlog.img,
                icon: iconPath || existingBlog.icon,
                status: status || existingBlog.status,
            };

            const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

            // Delete old files if new ones are uploaded
            if (req.files?.img && existingBlog.img) {
                await deleteFile(existingBlog.img);
            }
            if (req.files?.icon && existingBlog.icon) {
                await deleteFile(existingBlog.icon);
            }

            return res.status(200).json({
                success: true,
                message: 'Blog updated successfully',
                data: blog,
            });
        });
    } catch (error) {
        // Delete uploaded files if an error occurs
        if (imgPath) await deleteFile(imgPath);
        if (iconPath) await deleteFile(iconPath);

        next(error);
    }
};

const deleteBlog = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find and delete the blog
        const blog = await Blog.findByIdAndDelete(id);
        if (!blog) {
            throw new ApiError('Blog not found', 404);
        }

        // Delete associated files
        if (blog.img) {
            await deleteFile(blog.img);
        }
        if (blog.icon) {
            await deleteFile(blog.icon);
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
        const blogs = await Blog.find({});

        return res.status(200).json({
            success: true,
            message: 'Blogs fetched successfully',
            data: blogs,
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

module.exports = {
    createBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
};