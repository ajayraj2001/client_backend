'use strict';
const mongoose = require('mongoose');
const {Address} = require('../../models')
const { Country, State, City } = require("country-state-city");

const addressController = {
  /**
   * Get all addresses for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getAddresses: async (req, res) => {
    try {
      const userId = req.user._id;

      // Get all addresses for user, sorted with default address first
      const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, created_at: -1 });

      return res.status(200).json({
        success: true,
        message: "address fetched",
        addresses
      });
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching addresses',
        error: error.message
      });
    }
  },

  /**
   * Add a new address
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const {
        name,
        mobileNumber,
        alternateNumber,
        address,
        landmark,
        city,
        state,
        pincode,
        addressType,
        isDefault
      } = req.body;

      // Validate required fields
      if (!name || !mobileNumber || !address || !city || !state || !pincode) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing'
        });
      }

      // Check if this is the first address
      const addressCount = await Address.countDocuments({ userId });
      const shouldBeDefault = isDefault === true || addressCount === 0;

      // Create new address
      const createAddress = new Address({
        userId,
        name,
        mobileNumber,
        alternateNumber,
        address,
        landmark: landmark || '',
        city,
        state,
        country: 'India', // Default
        pincode,
        addressType: addressType || 'HOME',
        isDefault: shouldBeDefault
      });

      if (shouldBeDefault) {
        // Unset any existing default address
        await Address.updateMany(
          { userId, isDefault: true },
          { $set: { isDefault: false } },
          { session }
        );
      }

      await createAddress.save({ session });
      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        address
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error adding address:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding address',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Update an address
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const { addressId } = req.params;
      const updateData = req.body;

      // Find the address
      const address = await Address.findOne({
        _id: addressId,
        userId
      }).session(session);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Check if making this the default address
      const setAsDefault = updateData.isDefault === true && !address.isDefault;

      if (setAsDefault) {
        // Unset any existing default address
        await Address.updateMany(
          { userId, _id: { $ne: addressId }, isDefault: true },
          { $set: { isDefault: false } },
          { session }
        );
      }

      // Update address with all provided fields
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'userId' && key !== 'created_at' && key !== 'updated_at') {
          address[key] = updateData[key];
        }
      });

      await address.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        address
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error updating address:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating address',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Delete an address
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const { addressId } = req.params;

      // Find the address
      const address = await Address.findOne({
        _id: addressId,
        userId
      }).session(session);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const wasDefault = address.isDefault;

      // Delete the address
      await address.deleteOne({ session });

      // If this was the default address, set another as default if available
      if (wasDefault) {
        const nextAddress = await Address.findOne({ userId }).sort({ created_at: -1 }).session(session);
        
        if (nextAddress) {
          nextAddress.isDefault = true;
          await nextAddress.save({ session });
        }
      }

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error deleting address:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting address',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Set an address as default
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  setDefaultAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const { addressId } = req.params;

      // Find the address
      const address = await Address.findOne({
        _id: addressId,
        userId
      }).session(session);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If already default, do nothing
      if (address.isDefault) {
        await session.commitTransaction();
        return res.status(200).json({
          success: true,
          message: 'Address is already the default'
        });
      }

      // Unset any existing default address
      await Address.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );

      // Set this address as default
      address.isDefault = true;
      await address.save({ session });

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Address set as default successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error setting default address:', error);
      return res.status(500).json({
        success: false,
        message: 'Error setting default address',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }
};

const getStates = async (req, res, next) => {
  try {
    const { searchTerm } = req.query; // pass isoCode in countryCode
    const countryCode = "IN"

    let states = State.getStatesOfCountry(countryCode);

    if (searchTerm) {
      states = states.filter((state) =>
        state.name.toLowerCase().startsWith(searchTerm.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      message: "State fetched successfully.",
      data: states,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

const getCities = async (req, res, next) => {
  try {
    const { searchTerm, stateCode } = req.query; // pass isoCode in stateCode
    const countryCode = "IN"

    // Check if stateCode is provided
    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: "State code (ISO) is required.",
      });
    }

    let cities = City.getCitiesOfState(countryCode, stateCode);
    if (searchTerm) {
      cities = cities.filter((city) =>
        city.name.toLowerCase().startsWith(searchTerm.toLowerCase())
      );
    }

    return res.status(200).json({
      success: true,
      message: "City fetched successfully.",
      data: cities,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

module.exports = {addressController, getStates, getCities};