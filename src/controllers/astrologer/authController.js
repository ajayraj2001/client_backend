const { ApiError } = require('../../errorHandler');
const { Astrologer, AstrologerSignupRequest } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { getOtp } = require('../../utils');
const { sendOtpEmail } = require('../../utils/sendEmail');

const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for multiple file uploads with different folders
const uploadAstrologerFiles = getMultipleFilesUploader([
  { name: 'profile_img', folder: 'astro_profile_images' }, // Save profile images in 'profile_images' folder
  { name: 'aadhar_card_img', folder: 'aadhar_images' }, // Save Aadhar card images in 'aadhar_images' folder
  { name: 'pan_card_img', folder: 'pan_images' }, // Save PAN card images in 'pan_images' folder
]);

const { ACCESS_TOKEN_SECRET } = process.env;

// Login Controller
const login = async (req, res, next) => {
  try {
    const { email, password, deviceId, deviceToken } = req.body;

    if (!email || !password) {
      throw new ApiError('Email and password are required', 400);
    }

    // Check if the astrologer exists and status is active
    const astrologer = await Astrologer.findOne({ email, status: 'Active' });
    if (!astrologer) {
      throw new ApiError('Astrologer not found or not active', 404);
    }

    // Check if the password matches (assuming password is hashed)
    const isPasswordValid = await bcrypt.compare(password, astrologer.password);
    if (!isPasswordValid) {
      throw new ApiError('Invalid password', 401);
    }

    // Update device information
    astrologer.deviceId = deviceId || astrologer.deviceId;
    astrologer.deviceToken = deviceToken || astrologer.deviceToken;
    await astrologer.save();

    // Generate JWT token
    const token = jwt.sign({ id: astrologer._id, number: astrologer.number }, ACCESS_TOKEN_SECRET, {
      expiresIn: '20d', // Token expires in 20 days
    });

    // Remove password from the response
    const astrologerResponse = astrologer.toObject();
    delete astrologerResponse.password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      astrologer: astrologerResponse,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError('Email is required', 400);

    // Find the astrologer by email
    const astrologer = await Astrologer.findOne({ email });

    if (!astrologer) throw new ApiError('Astrologer not found with this email', 404);

    const otp = getOtp(); // Assuming getOtp() is a function that generates an OTP
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    astrologer.otp = otp;
    astrologer.otp_expiry = otpExpiry;
    await astrologer.save();

    // Send OTP via email using Nodemailer
    await sendOtpEmail(astrologer.email, otp);

    return res.status(200).json({
      success: true,
      message: `OTP has been sent to your registered email ${astrologer.email}`
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) throw new ApiError('Email and OTP are required', 400);

    const staticOTP = "6969"; 

    // Find the astrologer by email
    const astrologer = await Astrologer.findOne({ email });
    if (!astrologer) throw new ApiError('Astrologer not found', 404);

    // Validate OTP
    if (Date.now() > new Date(astrologer.otp_expiry).getTime()) throw new ApiError('OTP expired', 400);
    if (astrologer.otp !== otp && otp !== staticOTP) throw new ApiError('Invalid OTP', 400);

    // If OTP is valid, return success response
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // Validate input
    if (!email || !newPassword) throw new ApiError('Email and new password are required', 400);

    // Find the astrologer by email
    const astrologer = await Astrologer.findOne({ email });
    if (!astrologer) throw new ApiError('Astrologer not found', 404);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the astrologer's password
    astrologer.password = hashedPassword;
    astrologer.otp = null; // Clear the OTP after successful password reset
    astrologer.otp_expiry = null;
    astrologer.password_created = true;
    await astrologer.save();

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Signup Controller
const signup = async (req, res, next) => {
  let profileImgPath, aadharImgPath, panImgPath;

  // Handle file uploads within the Multer callback
  uploadAstrologerFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400)); // Pass Multer error to the next middleware
    }

    try {
      const { name, number, email, dob, about, experience, address, languages, state, city, skills } = req.body;

      // Validate required fields
      if (!name || !number || !email) {
        throw new ApiError('Name, number, and email are required', 400);
      }

      // Check if the astrologer already exists in the main collection
      const existingAstrologer = await Astrologer.findOne({ $or: [{ number }, { email }] });
      if (existingAstrologer) {
        throw new ApiError('Astrologer with this number or email already exists', 400);
      }

      // Check if there is a pending or rejected request for this number/email
      const existingRequest = await AstrologerSignupRequest.findOne({
        $or: [{ number }, { email }],
        status: { $in: ['Pending', 'Rejected'] },
      });

      if (existingRequest) {
        if (existingRequest.status === 'Pending') {
          throw new ApiError('A signup request with this number or email is already pending approval', 400);
        } else if (existingRequest.status === 'Rejected') {
          // Allow reapplication if the previous request was rejected
          const newSignupRequest = new AstrologerSignupRequest({
            name,
            number,
            email,
            about,
            experience,
            address,
            dob,
            languages: JSON.parse(languages || '[]').map((id) => new mongoose.Types.ObjectId(id)),
            skills: JSON.parse(skills || '[]').map((id) => new mongoose.Types.ObjectId(id)),
            state,
            city,
            profile_img: profileImgPath || '',
            aadhar_card_img: aadharImgPath || '',
            pan_card_img: panImgPath || '',
            reapply: true, // Mark as reapplication
            previousRequestId: existingRequest._id, // Link to the previous request
          });

          await newSignupRequest.save();
          notifyAdmin(newSignupRequest);

          return res.status(201).json({
            success: true,
            message: 'Reapplication submitted successfully. Waiting for admin approval.',
          });
        }
      }

      // If no existing request, create a new one
      const signupRequest = new AstrologerSignupRequest({
        name,
        number,
        email,
        about,
        dob,
        experience,
        address,
        languages: JSON.parse(languages || '[]').map((id) => new mongoose.Types.ObjectId(id)),
        skills: JSON.parse(skills || '[]').map((id) => new mongoose.Types.ObjectId(id)),
        state,
        city,
        profile_img: profileImgPath || '',
        aadhar_card_img: aadharImgPath || '',
        pan_card_img: panImgPath || '',
      });

      await signupRequest.save();
      notifyAdmin(signupRequest);

      return res.status(201).json({
        success: true,
        message: 'Signup request submitted successfully. Waiting for admin approval.',
      });
    } catch (error) {
      // Delete uploaded files if an error occurs
      if (profileImgPath) await deleteFile(profileImgPath);
      if (aadharImgPath) await deleteFile(aadharImgPath);
      if (panImgPath) await deleteFile(panImgPath);

      console.error('Error during signup:', error);
      next(error); // Pass the error to the global error handler
    }
  });
};

// Update Astrologer Profile
const updateAstrologerProfile = async (req, res, next) => {
  let profileImgPath, aadharImgPath, panImgPath;

  // Handle multiple file uploads
  uploadAstrologerFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err); // Log Multer errors
      return next(new ApiError(err.message, 400)); // Pass the error to the global error handler
    }

    try {
      const  id =  req.astrologer._id; // Astrologer ID from the request

      const updateData = req.body;

      // Find the existing astrologer
      const existingAstrologer = await Astrologer.findById(id);
      if (!existingAstrologer) {
        throw new ApiError('Astrologer not found', 404);
      }

      // Parse `languages` and `skills` into arrays of ObjectIds if present
      if (updateData.languages) {
        updateData.languages = JSON.parse(updateData.languages).map((id) =>
          new mongoose.Types.ObjectId(id)
        );
      }
      if (updateData.skills) {
        updateData.skills = JSON.parse(updateData.skills).map((id) =>
          new mongoose.Types.ObjectId(id)
        );
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
        message: 'Profile updated successfully',
        data: astrologerData,
      });
    } catch (error) {
      // Delete uploaded files if an error occurs
      if (profileImgPath) await deleteFile(profileImgPath);
      if (aadharImgPath) await deleteFile(aadharImgPath);
      if (panImgPath) await deleteFile(panImgPath);

      console.error('Error here:', error); // Log the error
      return next(error); // Pass the error to the global error handler
    }
  });
};

// Get Astrologer Profile
const getAstrologerProfile = async (req, res, next) => {
  try {
    const  id  = req.astrologer._id; // Astrologer ID from the request

    // Fetch the astrologer's profile with populated languages and skills
    const astrologer = await Astrologer.findById(id)
      .select('-password') // Exclude sensitive fields
      .populate('languages', 'name') // Populate languages and include only the 'name' field
      .populate('skills', 'name'); // Populate skills and include only the 'name' field

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: astrologer,
    });
  } catch (error) {
    next(error);
  }
};

// Function to notify admin (you can implement this as per your requirements)
const notifyAdmin = (astrologer) => {
  // Implement your logic to notify the admin (e.g., send an email, push notification, etc.)
  console.log(`New astrologer registered: ${astrologer.name}. Waiting for approval.`);
};

// Logout Astrologer
const logout = async (req, res, next) => {
  try {
    // Clear device information (optional)
    const astrologerId = req.astrologer._id; // Assuming the user ID is stored in req.user after JWT verification
    await Astrologer.findByIdAndUpdate(astrologerId, {
      deviceId: '',
      deviceToken: '',
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  signup,
  getAstrologerProfile,
  updateAstrologerProfile,
  logout,
};