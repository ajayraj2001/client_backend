const express = require('express');
const { ApiError } = require('../../errorHandler');
const { UserSetting, AstroSetting } = require('../../models');

// Create or Update Site Settings
const createSiteSettingData = async (req, res, next) => {
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
    if (settings) {
      settings = await settingsModel.findOneAndUpdate({}, req.body, { new: true });
    } else {
      settings = await settingsModel.create(req.body);
    }

    return res.status(200).json({
      success: true,
      message: `Site settings for ${type} updated successfully`,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
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

    const settings = await settingsModel.findOne();
    if (!settings) {
      throw new ApiError(`No settings found for ${type}`, 404);
    }

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
