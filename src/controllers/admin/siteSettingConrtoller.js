const express = require('express');
const { ApiError } = require('../../errorHandler');
const { UserSetting, AstroSetting } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for multiple maintenance image uploads
const uploadMaintenanceImages = getMultipleFilesUploader([
  { name: 'android_maintenance_image', folder: 'site_settings', maxCount: 1 },
  { name: 'ios_maintenance_image', folder: 'site_settings', maxCount: 1 },
]);

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

      // Handle Android maintenance image upload
      if (req.files?.android_maintenance_image) {
        const newAndroidImgPath = `/site_settings/${req.files.android_maintenance_image[0].filename}`;
        if (settings?.[type]?.android?.android_maintenance_image) {
          await deleteFile(settings[type].android.android_maintenance_image);
        }
        updatedData[`${type}.android.maintenance_image`] = newAndroidImgPath;
      } else if (settings) {
        updatedData[`${type}.android.maintenance_image`] = settings[type]?.android?.android_maintenance_image || '';
      }

      // Handle iOS maintenance image upload
      if (req.files?.ios_maintenance_image) {
        const newIosImgPath = `/site_settings/${req.files.ios_maintenance_image[0].filename}`;
        if (settings?.[type]?.ios?.ios_maintenance_image) {
          await deleteFile(settings[type].ios.ios_maintenance_image);
        }
        updatedData[`${type}.ios.maintenance_image`] = newIosImgPath;
      } else if (settings) {
        updatedData[`${type}.ios.maintenance_image`] = settings[type]?.ios?.ios_maintenance_image || '';
      }


      console.log('updatedData',updatedData)
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

      // Fetch settings; if none exist, return an empty object
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
