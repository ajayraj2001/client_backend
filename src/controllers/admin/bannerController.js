const { ApiError } = require('../../errorHandler');
const { Banner } = require('../../models');
const { getFileUploader, deleteFile } = require('../../middlewares'); // Import Multer functions

// Multer setup for multiple file uploads
const uploadBannerImage = getFileUploader('img', 'banner_images'); 

// Create Banner
const createBanner = async (req, res, next) => {
  uploadBannerImage(req, res, async (err) => {
      if (err) {
          console.error('Multer Error:', err); // Log Multer errors
          return next(new ApiError(err.message, 400)); // Pass error to global error handler
      }

      let bannerImgPath = '';
      try {
          const { link, type, status } = req.body;

          // Save file paths if files are uploaded
          if (req.file) {
              bannerImgPath = `/banner_images/${req.file.filename}`;
          }

          // Create new banner
          const banner = new Banner({
              link,
              type,
              img: bannerImgPath,
              status,
          });

          await banner.save();

          return res.status(201).json({
              success: true,
              message: 'Banner created successfully',
              data: banner,
          });
      } catch (error) {
          // Delete uploaded files if an error occurs
          if (bannerImgPath) {
              await deleteFile(bannerImgPath);
          }
          console.error('Error here:', error);
          
          // Respond with error
          return next(error); 
      }
  });
};

// Update Banner
const updateBanner = async (req, res, next) => {
  uploadBannerImage(req, res, async (err) => {
      if (err) {
          console.error('Multer Error:', err);
          return next(new ApiError(err.message, 400));
      }

      let bannerImgPath = '';
      try {
          const { id } = req.params;
          const { link, type, status } = req.body;

          // Find the existing banner
          const existingBanner = await Banner.findById(id);
          if (!existingBanner) {
              return next(new ApiError('Banner not found', 404));
          }

          // Save new file path if a file is uploaded
          if (req.file) {
              bannerImgPath = `/banner_images/${req.file.filename}`;
          }

          // Prepare update data
          const updateData = {
              link: link || existingBanner.link,
              type: type || existingBanner.type,
              img: bannerImgPath || existingBanner.img,
              status: status || existingBanner.status,
          };

          // Update the banner
          const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, { new: true });

          // Delete the old image if a new one was uploaded
          if (req.file && existingBanner.img) {
              await deleteFile(existingBanner.img);
          }

          return res.status(200).json({
              success: true,
              message: 'Banner updated successfully',
              data: updatedBanner,
          });
      } catch (error) {
          // Delete uploaded files if an error occurs
          if (bannerImgPath) {
              await deleteFile(bannerImgPath);
          }
          console.error('Error in updateBanner:', error);
          return next(error);
      }
  });
};

// Delete Banner
const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the banner
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      throw new ApiError('Banner not found', 404);
    }

  // Delete associated image
  if (banner.img) {
    await deleteFile(banner.img);
  }

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Banners
const getAllBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({}).sort({_id:-1});

    return res.status(200).json({
      success: true,
      message: 'Banners fetched successfully',
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// Get Banner by ID
const getBannerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      throw new ApiError('Banner not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Banner fetched successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

const updateBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const banner = await Banner.findByIdAndUpdate(id, { status }, { new: true });

    if (!banner) {
      throw new ApiError('Banner not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Banner status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBanner,
  updateBanner,
  deleteBanner,
  getAllBanners,
  getBannerById,
  updateBannerStatus,
};