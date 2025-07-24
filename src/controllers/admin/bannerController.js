const mongoose = require('mongoose')
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
      const { type, status, redirectType, redirectId, redirectUrl } = req.body;
      // const { type, status, redirectUrl } = req.body;

      // // Validate redirect data
      if (redirectType === 'external' && !redirectUrl) {
        return next(new ApiError('Redirect URL is required for external redirect type', 400));
      }

      if ((redirectType === 'puja' || redirectType === 'product') && redirectId && !mongoose.Types.ObjectId.isValid(redirectId)) {
        return next(new ApiError('Invalid redirect ID format', 400));
      }

      // Save file paths if files are uploaded
      if (req.file) {
        bannerImgPath = `/banner_images/${req.file.filename}`;
      }

      // Create new banner
      const banner = new Banner({
        type,
        img: bannerImgPath,
        status,
        redirectType: redirectType || 'none',
        redirectId: redirectType === 'none' ? null : redirectId,
        redirectUrl: redirectType === 'external' ? redirectUrl : null,
        // redirectUrl: redirectUrl
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
      const { type, status, redirectType, redirectId, redirectUrl } = req.body;
      // const { type, status, redirectUrl } = req.body;

      // Find the existing banner
      const existingBanner = await Banner.findById(id);
      if (!existingBanner) {
        return next(new ApiError('Banner not found', 404));
      }

      // Validate redirect data
      if (redirectType === 'external' && !redirectUrl) {
        return next(new ApiError('Redirect URL is required for external redirect type', 400));
      }

      if ((redirectType === 'puja' || redirectType === 'product') && redirectId && !mongoose.Types.ObjectId.isValid(redirectId)) {
        return next(new ApiError('Invalid redirect ID format', 400));
      }

      // Save new file path if a file is uploaded
      if (req.file) {
        bannerImgPath = `/banner_images/${req.file.filename}`;
      }

      // Prepare update data
      const updateData = {
        type: type || existingBanner.type,
        img: bannerImgPath || existingBanner.img,
        status: status || existingBanner.status,
        // redirectUrl: redirectUrl || existingBanner.redirectUrl,
        redirectType: redirectType !== undefined ? redirectType : existingBanner.redirectType,
        redirectId: redirectType === 'none' ? null : (redirectId !== undefined ? redirectId : existingBanner.redirectId),
        redirectUrl: redirectType === 'external' ? redirectUrl : (redirectType === 'none' ? null : existingBanner.redirectUrl),
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
    const banners = await Banner.find({}).sort({ _id: -1 });

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

// Update Banner Status
const updateBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the banner status
    const banner = await Banner.findByIdAndUpdate(id, { status }, { new: true });

    if (!banner) {
      throw new ApiError('Banner not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Banner status updated successfully',
      data: banner
    });
  } catch (error) {
    next(error);
  }
};

// Handle Banner Click (New function to handle redirects)
const handleBannerClick = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      throw new ApiError('Banner not found', 404);
    }

    if (banner.status !== 'Active') {
      throw new ApiError('Banner is not active', 400);
    }

    let redirectData = {
      redirectType: banner.redirectType,
      redirectId: banner.redirectId,
      redirectUrl: banner.redirectUrl
    };

    // Based on redirect type, you can add additional logic here
    switch (banner.redirectType) {
      case 'puja':
        redirectData.message = 'Redirecting to puja collection';
        redirectData.endpoint = banner.redirectId ? `/api/puja/${banner.redirectId}` : '/api/puja';
        break;
      case 'product':
        redirectData.message = 'Redirecting to product collection';
        redirectData.endpoint = banner.redirectId ? `/api/product/${banner.redirectId}` : '/api/product';
        break;
      case 'external':
        redirectData.message = 'Redirecting to external URL';
        redirectData.endpoint = banner.redirectUrl;
        break;
      case 'none':
      default:
        redirectData.message = 'No redirect configured';
        redirectData.endpoint = null;
        break;
    }

    return res.status(200).json({
      success: true,
      message: 'Banner click handled successfully',
      data: redirectData,
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
  handleBannerClick,
};