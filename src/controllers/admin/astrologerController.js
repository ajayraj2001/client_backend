const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { ApiError } = require('../../errorHandler');
const { Astrologer, BankAccountRequest, AstrologerSignupRequest, AstrologerWalletHistory, Rating } = require('../../models');

const { sendLoginCredentials, notifyAstrologer } = require('../../utils/sendEmail')
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
  uploadAstrologerFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let profileImgPath, aadharImgPath, panImgPath;

    try {
      const {
        name,
        number,
        email,
        password,
        status,
        about,
        dob,
        gender,
        experience,
        address,
        languages,
        skills,
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
        if (existingAstrologer.email === email) {
          return res.status(400).json({ success: false, message: "Astrologer with this email already exists" });
        }
        if (existingAstrologer.number === number) {
          return res.status(400).json({ success: false, message: "Astrologer with this number already exists" });
        }
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Parse `languages` and `skills` into arrays of ObjectIds or default to empty arrays
      const parsedLanguages = languages ? JSON.parse(languages).map((id) => new mongoose.Types.ObjectId(id)) : [];
      const parsedSkills = skills ? JSON.parse(skills).map((id) => new mongoose.Types.ObjectId(id)) : [];
      const parsedAccountDetails = account_details ? JSON.parse(account_details) : {};

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
        dob,
        gender,
        password: hashedPassword,
        status,
        about,
        experience,
        address,
        languages: parsedLanguages,
        skills: parsedSkills,
        state,
        city,
        account_details: parsedAccountDetails,
        wallet,
        commission,
        per_min_chat,
        per_min_voice_call,
        per_min_video_call,
        is_chat,
        is_voice_call,
        is_video_call,
        profile_img: profileImgPath || '',
        aadhar_card_img: aadharImgPath || '',
        pan_card_img: panImgPath || '',
        contact_no2,
        pincode,
        pan_card,
        aadhar_card_no,
        gst,
        call_type,
      });

      await astrologer.save();

      // Populate languages and skills before sending response
      const populatedAstrologer = await Astrologer.findById(astrologer._id)
        .populate('languages', 'name')
        .populate('skills', 'name');

      // Exclude password from the response
      const astrologerData = populatedAstrologer.toObject();
      delete astrologerData.password;

      return res.status(201).json({
        success: true,
        message: 'Astrologer created successfully',
        data: astrologerData,
      });

    } catch (error) {
      // Delete uploaded files if an error occurs
      if (profileImgPath) await deleteFile(profileImgPath);
      if (aadharImgPath) await deleteFile(aadharImgPath);
      if (panImgPath) await deleteFile(panImgPath);

      console.error('Error in createAstrologer:', error);
      return next(error);
    }
  });
};

// Update Astrologer
const updateAstrologer = async (req, res, next) => {
  uploadAstrologerFiles(req, res, async (err) => {
    console.log("Multer middleware triggered for updateAstrologer");
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let profileImgPath, aadharImgPath, panImgPath;

    try {
      const { id } = req.params;
      const { email, number, is_chat, is_voice_call, is_video_call } = req.body;
      const updateData = req.body;

      const astroExist = await Astrologer.findById(id);
      if (!astroExist) {
        throw new ApiError('Asrtollger not found', 404);
      }

      // Check if another astrologer with the same email or number exists
      const existingAstrologer = await Astrologer.findOne({
        $or: [{ email }, { number }],
        _id: { $ne: id }, // Exclude the astrologer being updated
      });

      if (existingAstrologer) {
        if (existingAstrologer.email === email) {
          return res.status(400).json({ success: false, message: "Astrologer with this email already exists" });
        }
        if (existingAstrologer.number === number) {
          return res.status(400).json({ success: false, message: "Astrologer with this number already exists" });
        }
      }

      // Parse `languages`, `skills`, and `account_details` into correct formats
      if (updateData.languages) {
        updateData.languages = JSON.parse(updateData.languages).map(id => new mongoose.Types.ObjectId(id));
      }
      if (updateData.skills) {
        updateData.skills = JSON.parse(updateData.skills).map(id => new mongoose.Types.ObjectId(id));
      }
      if (updateData.account_details) {
        updateData.account_details = JSON.parse(updateData.account_details);
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

       // Automatically set is_chat_online & is_voice_online to "off" if chat or voice_call is disabled
       if (is_chat === "off") {
        updateData.is_chat_online = "off";
      }
      if (is_voice_call === "off") {
        updateData.is_voice_online = "off";
      }
      if (is_video_call === "off") {
        updateData.is_video_online = "off";
      }

      // Find the astrologer to get existing file paths
      const astrologer = await Astrologer.findByIdAndUpdate(id, updateData, { new: true })
        .populate('languages', 'name')
        .populate('skills', 'name');

      if (!astrologer) {
        throw new ApiError("Astrologer not found", 404);
      }

      // Delete old files if new files were uploaded
      if (req.files?.profile_img && astroExist.profile_img) {
        await deleteFile(astroExist.profile_img);
      }
      if (req.files?.aadhar_card_img && astroExist.aadhar_card_img) {
        await deleteFile(astroExist.aadhar_card_img);
      }
      if (req.files?.pan_card_img && astroExist.pan_card_img) {
        await deleteFile(astroExist.pan_card_img);
      }

      // Exclude password from the response
      const astrologerData = astrologer.toObject();
      delete astrologerData.password;

      return res.status(200).json({
        success: true,
        message: "Astrologer updated successfully",
        data: astrologerData,
      });

    } catch (error) {
      // Delete newly uploaded files if an error occurs
      if (profileImgPath) await deleteFile(profileImgPath);
      if (aadharImgPath) await deleteFile(aadharImgPath);
      if (panImgPath) await deleteFile(panImgPath);

      console.error("Error in updateAstrologer:", error);
      return next(error);
    }
  });
};

// Delete Astrologer
const deleteAstrologer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the astrologer
    const astrologer = await Astrologer.findByIdAndDelete(id);


    console.log('astrolger_raha', astrologer)
    console.log('tur or false ', !astrologer)
    if (!astrologer) {
      console.log('why tus hapoaneing')
      throw new ApiError('Astrologer not found', 404);
    }

    console.log('hkahna sur ')

    // Delete associated files
    if (astrologer.profile_img) {
      await deleteFile(astrologer.profile_img);
    }
    if (astrologer.aadhar_card_img) {
      await deleteFile(astrologer.aadhar_card_img);
    }
    if (astrologer.pan_card_img) {
      await deleteFile(astrologer.pan_card_img);
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
    const astrologers = await Astrologer.find()
      .sort({ created_at: -1 }) // Sort by latest
      .select('-password') // Exclude password
      .populate('languages', 'name')
      .populate('skills', 'name');

    return res.status(200).json({
      success: true,
      message: 'Astrologers fetched successfully',
      astrologers
    });
  } catch (error) {
    next(error);
  }
};

// const getAllAstrologers = async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const search = req.query.search || '';
//     const statusFilter = req.query.status || { $exists: true }; // Default: no filter
//     const minRating = parseFloat(req.query.minRating) || 0;
//     const maxRating = parseFloat(req.query.maxRating) || 5;
//     const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
//     const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
//     const sortBy = req.query.sortBy || 'created_at';
//     const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

//     // Build the search query
//     const searchQuery = {
//       $and: [
//         { status: statusFilter },
//         { rating: { $gte: minRating, $lte: maxRating } },
//         {
//           $or: [
//             { name: { $regex: search, $options: 'i' } }, // Case-insensitive search by name
//             { number: { $regex: search, $options: 'i' } }, // Case-insensitive search by number
//             { email: { $regex: search, $options: 'i' } } // Case-insensitive search by email
//           ]
//         }
//       ]
//     };

//     // Add date filter if provided
//     if (startDate || endDate) {
//       searchQuery.$and.push({
//         created_at: {
//           $gte: startDate || new Date(0), // If startDate is not provided, use the earliest possible date
//           $lte: endDate || new Date() // If endDate is not provided, use the current date
//         }
//       });
//     }

//     // Fetch astrologers with search, filters, and pagination
//     const astrologers = await Astrologer.find(searchQuery)
//       .sort({ [sortBy]: sortOrder }) // Dynamic sorting
//       .skip(skip)
//       .limit(limit)
//       .select('-password') // Exclude password field
//       .populate('languages', 'name')
//       .populate('skills', 'name');

//     // Count total astrologers matching the search query
//     const total = await Astrologer.countDocuments(searchQuery);

//     return res.status(200).json({
//       success: true,
//       message: 'Astrologers fetched successfully',
//       data: {
//         astrologers,
//         total,
//         page,
//         limit
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Get Astrologer by ID
const getAstrologerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const astrologer = await Astrologer.findById(id).select('-password')
      .populate('languages', 'name')
      .populate('skills', 'name');

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
      message: 'Astrologer status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

//bank approval requests
const getAllRequests = async (req, res, next) => {
  try {
    // Get the filters from query parameters (optional)
    const { status, name, number } = req.query;

    // Define the filter object
    const filter = {};

    // Add status filter if provided
    if (status) {
      if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        throw new ApiError('Invalid status. Status must be "Pending", "Approved", or "Rejected"', 400);
      }
      filter.status = status; // Add status to the filter
    }

    // Fetch all requests (filtered by status, name, or number if provided)
    const requests = await BankAccountRequest.find(filter)
      .populate('astrologer_id', 'name email number') // Populate astrologer details
      .sort({ _id: -1 });

    // Filter by astrologer's name or number if provided
    const filteredRequests = requests.filter(request => {
      let matches = true;

      if (name && !request.astrologer_id.name.toLowerCase().includes(name.toLowerCase())) {
        matches = false;
      }

      if (number && !request.astrologer_id.number.includes(number)) {
        matches = false;
      }

      return matches;
    });

    return res.status(200).json({
      success: true,
      message: 'Bank account requests fetched successfully',
      requests: filteredRequests,
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

      // Assign the new bank account details as a single object
      astrologer.account_details = {
        account_type: bankAccountRequest.account_type,
        account_holder_name: bankAccountRequest.account_holder_name,
        account_no: bankAccountRequest.account_no,
        bank: bankAccountRequest.bank,
        ifsc: bankAccountRequest.ifsc,
      };

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

//signup approval request
const getSignupRequests = async (req, res, next) => {
  try {
    const { status, fromDate, toDate, sortBy, sortOrder } = req.query;

    // Build the filter object
    const filter = {};
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.created_at = {};
      if (fromDate) filter.created_at.$gte = new Date(fromDate);
      if (toDate) filter.created_at.$lte = new Date(toDate);
    }

    // Build the sort object
    const sort = {};
    if (sortBy) sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Fetch signup requests with filters and sorting
    const signupRequests = await AstrologerSignupRequest.find(filter)
      .sort(sort)
      .select('-__v'); // Exclude unnecessary fields

    return res.status(200).json({
      success: true,
      message: 'Signup requests fetched successfully',
      data: signupRequests,
    });
  } catch (error) {
    next(error);
  }
};

const getSignupRequestDetails = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    // Fetch the signup request by ID
    const signupRequest = await AstrologerSignupRequest.findById(requestId)
      .select('-__v')
      .populate('languages', 'name')
      .populate('skills', 'name');

    if (!signupRequest) {
      throw new ApiError('Signup request not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Signup request details fetched successfully',
      data: signupRequest,
    });
  } catch (error) {
    next(error);
  }
};

const approveAstrologerSignup = async (req, res, next) => {
  try {
    const { requestId, action, rejectionReason } = req.body; // action can be 'approve' or 'reject'

    const signupRequest = await AstrologerSignupRequest.findById(requestId);
    if (!signupRequest) {
      throw new ApiError('Signup request not found', 404);
    }

    if (action === 'approve') {
      // Generate password using DOB and Aadhar number
      const password = generatePassword(signupRequest.dob, signupRequest.aadhar_card_no);

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new astrologer in the main collection
      const astrologer = new Astrologer({
        ...signupRequest.toObject(),
        password: hashedPassword,
        status: 'Active', // Set status to 'Inactive' initially
      });

      await astrologer.save();

      // Send login credentials to the astrologer
      sendLoginCredentials(signupRequest.email, signupRequest.dob);

      // Delete the signup request
      await AstrologerSignupRequest.findByIdAndDelete(requestId);

      return res.status(200).json({
        success: true,
        message: 'Astrologer approved successfully. Login credentials sent.',
      });
    } else if (action === 'reject') {
      // Update the request with rejection reason
      signupRequest.status = 'Rejected';
      signupRequest.rejectionReason = rejectionReason || 'Request rejected due to incomplete or incorrect information.';
      await signupRequest.save();

      // Notify the astrologer about the rejection
      notifyAstrologer(signupRequest.email, signupRequest.rejectionReason);

      return res.status(200).json({
        success: true,
        message: 'Signup request rejected successfully.',
      });
    } else {
      throw new ApiError('Invalid action', 400);
    }
  } catch (error) {
    next(error);
  }
};

const generatePassword = (dob, aadharNumber) => {
  // Extract the year from DOB (assuming format is DD-MM-YYYY)
  const year = dob.split('-')[2]; // Extracts the year part (e.g., "2001")

  // Extract the first four digits of the Aadhar number
  const aadharFirstFour = aadharNumber.substring(0, 4); // Extracts the first 4 digits

  // Combine them with a separator (e.g., "@")
  const password = `${year}@${aadharFirstFour}`;

  return password;
};

const getWalletHistory = async (req, res, next) => {
  try {
    const { id } = req.params; // Astrologer ID from params
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construct date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) } : {}),
      };
    }

    // Fetch the user's wallet history with pagination and date filter
    const walletHistory = await AstrologerWalletHistory.find({
      astrologer_id: id,
      ...dateFilter,
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Fetch total count for pagination
    const totalRecords = await AstrologerWalletHistory.countDocuments({
      astrologer_id: id,
      ...dateFilter,
    });

    // Fetch the user's current wallet balance
    const astrologer = await Astrologer.findById(id).select('wallet');

    return res.status(200).json({
      success: true,
      message: 'Wallet history fetched successfully',
      data: {
        currentBalance: astrologer?.wallet || 0, // Handle case where astrologer not found
        walletHistory,
      },
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAstrologerReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10; // 10 reviews per page

    // Fetch paginated reviews for the astrologer
    const reviews = await Rating.find({ astrologer_id: id })
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user_id', 'name number profile_img');

    // Get total number of reviews for pagination metadata
    const totalReviews = await Rating.countDocuments({ astrologer_id: id });

    return res.status(200).json({
      success: true,
      message: 'Astrologer reviews fetched successfully',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
        },
      },
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
  getSignupRequests,
  getSignupRequestDetails,
  approveAstrologerSignup,
  getWalletHistory,
  getAstrologerReviews,
};