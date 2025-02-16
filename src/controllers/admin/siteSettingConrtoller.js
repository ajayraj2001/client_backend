const express = require('express');
const { ApiError } = require('../../errorHandler');
const { UserSetting, AstroSetting } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for maintenance image uploads
const uploadMaintenanceImages = getMultipleFilesUploader([
  { name: 'android_maintenance_image', folder: 'site_settings', maxCount: 1 },
  { name: 'ios_maintenance_image', folder: 'site_settings', maxCount: 1 },
]);

// Utility function to parse boolean values correctly
const parseBoolean = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value; // Keep the original value if not "true" or "false"
};

// Create or Update Site Settings
const createSiteSettingData = async (req, res, next) => {
  uploadMaintenanceImages(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    try {
      const { type } = req.params;
      let settingsModel;

      if (type === 'user') {
        settingsModel = UserSetting;
      } else if (type === 'astro') {
        settingsModel = AstroSetting;
      } else {
        throw new ApiError('Invalid type. Use "user" or "astro".', 400);
      }
      
      let settings = await settingsModel.findOne();
      let updatedData = { ...req.body };
      
      console.log('updqted', updatedData.anroid)
      console.log('updqted', updatedData.anroid)
      // Convert boolean fields correctly
      if (updatedData?.android) {
        updatedData.android.mandatory_update = parseBoolean(updatedData.android.mandatory_update);
        updatedData.android.maintenance_status = parseBoolean(updatedData.android.maintenance_status);
      }
      if (updatedData?.ios) {
        updatedData.ios.mandatory_update = parseBoolean(updatedData.ios.mandatory_update);
        updatedData.ios.maintenance_status = parseBoolean(updatedData.ios.maintenance_status);
      }

      // Handle Android maintenance image upload
      if (req.files?.android_maintenance_image) {
        const newAndroidImgPath = `/site_settings/${req.files.android_maintenance_image[0].filename}`;
        if (settings?.android?.maintenance_image) {
          await deleteFile(settings.android.maintenance_image);
        }
        updatedData.android = { ...updatedData.android, maintenance_image: newAndroidImgPath };
      } else if (settings?.android?.maintenance_image) {
        // Keep existing image if no new one is uploaded
        updatedData.android = { ...updatedData.android, maintenance_image: settings.android.maintenance_image };
      }

      // Handle iOS maintenance image upload
      if (req.files?.ios_maintenance_image) {
        const newIosImgPath = `/site_settings/${req.files.ios_maintenance_image[0].filename}`;
        if (settings?.ios?.maintenance_image) {
          await deleteFile(settings.ios.maintenance_image);
        }
        updatedData.ios = { ...updatedData.ios, maintenance_image: newIosImgPath };
      } else if (settings?.ios?.maintenance_image) {
        // Keep existing image if no new one is uploaded
        updatedData.ios = { ...updatedData.ios, maintenance_image: settings.ios.maintenance_image };
      }

      // Update or create settings
      if (settings) {
        settings = await settingsModel.findOneAndUpdate({}, updatedData, { new: true });
      } else {
        settings = await settingsModel.create(updatedData);
      }

      return res.status(200).json({
        success: true,
        message: `Site settings for ${type} updated successfully`,
        data: settings,
      });

    } catch (error) {
      console.log('Error:', error);
      next(error);
    }
  });
};

// Get Site Settings
const getSiteSettingData = async (req, res, next) => {
  try {
    const { type } = req.params;
    let settingsModel;

    if (type === 'user') {
      settingsModel = UserSetting;
    } else if (type === 'astro') {
      settingsModel = AstroSetting;
    } else {
      throw new ApiError('Invalid type. Use "user" or "astro".', 400);
    }

    const settings = await settingsModel.findOne() || {};

    return res.status(200).json({
      success: true,
      message: `Site settings for ${type} retrieved successfully`,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSiteSettingData,
  getSiteSettingData
};
