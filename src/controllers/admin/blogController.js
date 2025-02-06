const { ApiError } = require('../../errorHandler');
const { Blog } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for multiple file uploads
const uploadBlogFiles = getMultipleFilesUploader([
  { name: 'thumbnailImage', folder: 'blog_thumbnails', maxCount: 1 }, // Single thumbnail image
  { name: 'galleryImages', folder: 'blog_gallery', maxCount: 10 }, // Multiple gallery images (max 10)
]);

const createBlog = async (req, res, next) => {
  uploadBlogFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let thumbnailImagePath = '';
    let galleryImagePaths = [];

    try {
      const { title, description, author, status } = req.body;

      // Save file paths if files are uploaded
      if (req.files?.thumbnailImage) {
        thumbnailImagePath = `/blog_thumbnails/${req.files.thumbnailImage[0].filename}`;
      }
      if (req.files?.galleryImages) {
        galleryImagePaths = req.files.galleryImages.map(file => `/blog_gallery/${file.filename}`);
      }

      // Create new blog
      const blog = new Blog({
        title,
        description,
        author,
        thumbnailImage: thumbnailImagePath || '',
        galleryImages: galleryImagePaths,
        status,
      });

      await blog.save();

      return res.status(201).json({
        success: true,
        message: 'Blog created successfully',
        data: blog,
      });

    } catch (error) {
      // Delete uploaded files if an error occurs
      if (thumbnailImagePath) await deleteFile(thumbnailImagePath);
      if (galleryImagePaths.length > 0) {
        await Promise.all(galleryImagePaths.map(path => deleteFile(path)));
      }

      next(error);
    }
  });
};

const updateBlog = async (req, res, next) => {
  uploadBlogFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let thumbnailImagePath = '';
    let galleryImagePaths = [];

    try {
      const { id } = req.params;
      const { title, description, author, status } = req.body;

      // Find the existing blog
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        throw new ApiError('Blog not found', 404);
      }

      // Save new file paths if files are uploaded
      if (req.files?.thumbnailImage) {
        thumbnailImagePath = `/blog_thumbnails/${req.files.thumbnailImage[0].filename}`;
      }
      if (req.files?.galleryImages) {
        galleryImagePaths = req.files.galleryImages.map(file => `/blog_gallery/${file.filename}`);
      }

      // Update the blog
      const updateData = {
        title: title || existingBlog.title,
        description: description || existingBlog.description,
        author: author || existingBlog.author,
        thumbnailImage: thumbnailImagePath || existingBlog.thumbnailImage,
        galleryImages: galleryImagePaths.length > 0 ? galleryImagePaths : existingBlog.galleryImages,
        status: status || existingBlog.status,
      };

      const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

      if (!blog) {
        throw new ApiError('Error updating blog', 500);
      }

      // Delete old files if new ones are uploaded
      if (req.files?.thumbnailImage && existingBlog.thumbnailImage) {
        await deleteFile(existingBlog.thumbnailImage);
      }
      if (req.files?.galleryImages && existingBlog.galleryImages.length > 0) {
        await Promise.all(existingBlog.galleryImages.map(path => deleteFile(path)));
      }

      return res.status(200).json({
        success: true,
        message: 'Blog updated successfully',
        data: blog,
      });

    } catch (error) {
      // Delete uploaded files if an error occurs
      if (thumbnailImagePath) await deleteFile(thumbnailImagePath);
      if (galleryImagePaths.length > 0) {
        await Promise.all(galleryImagePaths.map(path => deleteFile(path)));
      }

      next(error);
    }
  });
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
    if (blog.thumbnailImage) {
      await deleteFile(blog.thumbnailImage);
    }
    if (blog.galleryImages.length > 0) {
      await Promise.all(blog.galleryImages.map(path => deleteFile(path)));
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
    const blogs = await Blog.find({}).sort({_id:-1});

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

const updateBlogStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const blog = await Blog.findByIdAndUpdate(id, { status }, { new: true });

    if (!blog) {
      throw new ApiError('Blog not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Blog status updated successfully'
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
  updateBlogStatus,
};