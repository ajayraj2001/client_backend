const { ApiError } = require('../../errorHandler');
const { Astrologer, BankAccountRequest } = require('../../models');
const bcrypt = require('bcrypt');

const { getMultipleFilesUploader, deleteFile } = require('../../middlewares'); // Import the updated Multer function

// Multer setup for multiple file uploads with different folders
const uploadAstrologerFiles = getMultipleFilesUploader(
  [
    { name: 'profile_img', folder: 'astro_profile_images' }, // Save profile images in 'profile_images' folder
    { name: 'aadhar_card_img', folder: 'aadhar_images' }, // Save Aadhar card images in 'aadhar_images' folder
    { name: 'pan_card_img', folder: 'pan_images' }, // Save PAN card images in 'pan_images' folder
  ]
);

const createAstrologer = async (req, res, next) => {
  let profileImgPath, aadharImgPath, panImgPath;

  try {
    // Handle multiple file uploads
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer Error:', err); // Log Multer errors
        return next(new ApiError(err.message, 400));
      }

      const {
        name,
        number,
        email,
        password,
        status,
        about,
        experience,
        address,
        language,
        state,
        city,
        account_details,
        wallet,
        commission,
        per_min_chat,
        per_min_voice_call,
        per_min_video_call,
        is_chat,
        is_voice_call,
        is_video_call,
        contact_no2,
        pincode,
        pan_card,
        aadhar_card_no,
        gst,
        call_type,
      } = req.body;

      // Check if astrologer already exists
      const existingAstrologer = await Astrologer.findOne({ $or: [{ email }, { number }] });
      if (existingAstrologer) {
        throw new ApiError('Astrologer with this email or number already exists', 400);
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save file paths if files are uploaded
      if (req.files?.profile_img) {
        profileImgPath = `/astro_profile_images/${req.files.profile_img[0].filename}`;
      }
      if (req.files?.aadhar_card_img) {
        aadharImgPath = `/aadhar_images/${req.files.aadhar_card_img[0].filename}`;
      }
      if (req.files?.pan_card_img) {
        panImgPath = `/pan_images/${req.files.pan_card_img[0].filename}`;
      }

      // Create new astrologer
      const astrologer = new Astrologer({
        name,
        number,
        email,
        password: hashedPassword,
        status,
        about,
        experience,
        address,
        language,
        state,
        city,
        account_details,
        wallet,
        commission,
        per_min_chat,
        per_min_voice_call,
        per_min_video_call,
        is_chat,
        is_voice_call,
        is_video_call,
        profile_img: profileImgPath || '', // Save file path or empty string
        aadhar_card_img: aadharImgPath || '', // Save file path or empty string
        pan_card_img: panImgPath || '', // Save file path or empty string
        contact_no2,
        pincode,
        pan_card,
        aadhar_card_no,
        gst,
        call_type,
      });

      await astrologer.save();

      // Exclude password from the response
      const astrologerData = astrologer.toObject();
      delete astrologerData.password;

      return res.status(201).json({
        success: true,
        message: 'Astrologer created successfully',
        data: astrologerData,
      });
    });
  } catch (error) {
    // Delete uploaded files if an error occurs
    if (profileImgPath) await deleteFile(profileImgPath);
    if (aadharImgPath) await deleteFile(aadharImgPath);
    if (panImgPath) await deleteFile(panImgPath);

    next(error);
  }
};

// Update Astrologer
const updateAstrologer = async (req, res, next) => {
  let profileImgPath, aadharImgPath, panImgPath;
  try {
    
    // Handle multiple file uploads
    uploadAstrologerFiles(req, res, async (err) => {
      if (err) {
        console.error('Multer Error:', err); // Log Multer errors
        return next(new ApiError(err.message, 400));
      }

      const { id } = req.params;
      const updateData = req.body;

      // Find the existing astrologer
      const existingAstrologer = await Astrologer.findById(id);
      if (!existingAstrologer) {
        throw new ApiError('Astrologer not found', 404);
      }

      // Save new file paths if files are uploaded
      if (req.files?.profile_img) {
        profileImgPath = `/astro_profile_images/${req.files.profile_img[0].filename}`;
        updateData.profile_img = profileImgPath;
      }
      if (req.files?.aadhar_card_img) {
        aadharImgPath = `/aadhar_images/${req.files.aadhar_card_img[0].filename}`;
        updateData.aadhar_card_img = aadharImgPath;
      }
      if (req.files?.pan_card_img) {
        panImgPath = `/pan_images/${req.files.pan_card_img[0].filename}`;
        updateData.pan_card_img = panImgPath;
      }

      // Update the astrologer
      const astrologer = await Astrologer.findByIdAndUpdate(id, updateData, { new: true });

      // Delete old files if new files are uploaded
      if (req.files?.profile_img && existingAstrologer.profile_img) {
        await deleteFile(existingAstrologer.profile_img);
      }
      if (req.files?.aadhar_card_img && existingAstrologer.aadhar_card_img) {
        await deleteFile(existingAstrologer.aadhar_card_img);
      }
      if (req.files?.pan_card_img && existingAstrologer.pan_card_img) {
        await deleteFile(existingAstrologer.pan_card_img);
      }

      // Exclude password from the response
      const astrologerData = astrologer.toObject();
      delete astrologerData.password;

      return res.status(200).json({
        success: true,
        message: 'Astrologer updated successfully',
        data: astrologerData,
      });
    });
  } catch (error) {
    // Delete uploaded files if an error occurs
    if (profileImgPath) await deleteFile(profileImgPath);
    if (aadharImgPath) await deleteFile(aadharImgPath);
    if (panImgPath) await deleteFile(panImgPath);

    next(error);
  }
};


// Delete Astrologer
const deleteAstrologer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the astrologer
    const astrologer = await Astrologer.findByIdAndDelete(id);

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Astrologer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Astrologers
const getAllAstrologers = async (req, res, next) => {
  try {
    const astrologers = await Astrologer.find({}).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Astrologers fetched successfully',
      data: astrologers,
    });
  } catch (error) {
    next(error);
  }
};

// Get Astrologer by ID
const getAstrologerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const astrologer = await Astrologer.findById(id).select('-password');

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Astrologer fetched successfully',
      data: astrologer,
    });
  } catch (error) {
    next(error);
  }
};

// Update Astrologer Status
const updateAstrologerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const astrologer = await Astrologer.findByIdAndUpdate(id, { status }, { new: true });

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Astrologer status updated successfully',
      data: astrologer,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRequests = async (req, res, next) => {
  try {
      // Get the status filter from query parameters (optional)
      const { status } = req.query;

      // Define the filter object
      const filter = {};
      if (status) {
          // Validate the status
          if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
              throw new ApiError('Invalid status. Status must be "Pending", "Approved", or "Rejected"', 400);
          }
          filter.status = status; // Add status to the filter
      }

      // Fetch all requests (filtered by status if provided)
      const requests = await BankAccountRequest.find(filter).populate('astrologer_id', 'name email number');

      return res.status(200).json({
          success: true,
          message: 'Bank account requests fetched successfully',
          requests,
      });
  } catch (error) {
      next(error);
  }
};

const approveOrRejectRequest = async (req, res, next) => {
  try {
      const { request_id, status } = req.body;

      // Validate required fields
      if (!request_id || !status) {
          throw new ApiError('Request ID and status are required', 400);
      }

      // Check if the status is valid
      if (!['Approved', 'Rejected'].includes(status)) {
          throw new ApiError('Invalid status. Status must be "Approved" or "Rejected"', 400);
      }

      // Find the bank account request
      const bankAccountRequest = await BankAccountRequest.findById(request_id).populate('astrologer_id', 'name email number');
      if (!bankAccountRequest) {
          throw new ApiError('Bank account request not found', 404);
      }

      // Update the status of the request
      bankAccountRequest.status = status;
      await bankAccountRequest.save();

      // If approved, add the bank account to the astrologer's account_details
      if (status === 'Approved') {
          const astrologer = await Astrologer.findById(bankAccountRequest.astrologer_id);
          if (!astrologer) {
              throw new ApiError('Astrologer not found', 404);
          }

          astrologer.account_details.push({
              account_type: bankAccountRequest.account_type,
              account_holder_name: bankAccountRequest.account_holder_name,
              account_no: bankAccountRequest.account_no,
              bank: bankAccountRequest.bank,
              ifsc: bankAccountRequest.ifsc,
          });

          await astrologer.save();
      }

      return res.status(200).json({
          success: true,
          message: `Bank account request ${status.toLowerCase()} successfully`,
          bankAccountRequest,
      });
  } catch (error) {
      next(error);
  }
};




module.exports = {
  createAstrologer,
  updateAstrologer,
  deleteAstrologer,
  getAllAstrologers,
  getAstrologerById,
  updateAstrologerStatus,
  getAllRequests,
  approveOrRejectRequest,
};