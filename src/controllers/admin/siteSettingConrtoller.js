const express = require('express');
const { ApiError } = require('../../errorHandler');
const { UserSetting, AstroSetting } = require('../../models');
const { getFileUploader, deleteFile } = require('../../middlewares');

// Multer setup for maintenance image uploads
const uploadMaintenanceImage = getFileUploader('maintenance_image', 'site_settings');

// Create or Update Site Settings
const createSiteSettingData = async (req, res, next) => {
  uploadMaintenanceImage(req, res, async (err) => {
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

      // If a new image is uploaded, update it; otherwise, retain the existing one
      if (req.file) {
        const newImagePath = `/site_settings/${req.file.filename}`;

        // Delete the old image if it exists
        if (settings && settings[type]?.maintenance_image) {
          await deleteFile(settings[type].maintenance_image);
        }

        // Assign the new image path
        updatedData[`${type}.maintenance_image`] = newImagePath;
      } else if (settings) {
        // Retain the old image if no new file is uploaded
        updatedData[`${type}.maintenance_image`] = settings[type]?.maintenance_image || '';
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
