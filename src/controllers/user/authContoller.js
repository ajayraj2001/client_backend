const { ApiError } = require('../../errorHandler');
const { User, Otp } = require('../../models');
const { sendOTP } = require('../../utils/sendOtpToPhone');
const { getFileUploader, deleteFile } = require('../../middlewares');
const jwt = require('jsonwebtoken');

const { ACCESS_TOKEN_SECRET } = process.env;

// Generate and Send OTP
const login = async (req, res, next) => {
    try {
        const { number } = req.body;

        if (!number) {
            throw new ApiError('Number is required', 400);
        }

        // Check if the user already exists
        const user = await User.findOne({ number });
        if (user) {
            // If user exists, generate OTP and save it in the user document
            const otp = Math.floor(1000 + Math.random() * 9000).toString();

            user.otp = otp;
            user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
            await user.save();

            // Send OTP
            // const otpUrl = `http://commnestsms.com/api/push.json?apikey=6690b4eab7ca6&route=transactional&sender=ASTSTU&mobileno=${number}&text=${otp}%20is%20your%20Astro%20Setu%20Verification%20code%20to%20login%20into%20website.%0AAstro%20Setu`;
            // await sendOTP(otpUrl);

            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully',
            });
        } else {
            // If user does not exist, check if an OTP document already exists for this number
            let otpDoc = await Otp.findOne({ number });

            // Generate a new OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();


            if (otpDoc) {
                // If OTP document exists, update the OTP and expiration time
                otpDoc.otp = otp;
                otpDoc.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
                await otpDoc.save();
            } else {
                // If OTP document does not exist, create a new one
                otpDoc = await Otp.create({
                    number,
                    otp,
                    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // OTP expires in 10 minutes
                });
            }

            // Send OTP
            // const otpUrl = `http://commnestsms.com/api/push.json?apikey=6690b4eab7ca6&route=transactional&sender=ASTSTU&mobileno=${number}&text=${otp}%20is%20your%20Astro%20Setu%20Verification%20code%20to%20login%20into%20website.%0AAstro%20Setu`;
            // await sendOTP(otpUrl);

            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully',
            });
        }
    } catch (error) {
        next(error);
    }
};

// Verify OTP
const verifyOTP = async (req, res, next) => {
    try {
        const { number, otp, deviceToken, deviceId } = req.body;

        if (!number || !otp) {
            throw new ApiError('Number and OTP are required', 400);
        }
        console.log('req.body_whioe_lgin', req.body)

        // if (!deviceToken || !deviceId) {
        //     throw new ApiError(' deviceToken, and deviceId are required', 400);
        // }

        // Static OTP for testing purposes
        const staticOTP = "6969"; // Define your static OTP here

        // Check if the user exists
        const user = await User.findOne({ number });
        if (user) {
            // If user exists, verify OTP from the user document
            if (user.otp !== otp && otp !== staticOTP) { // Allow static OTP for testing
                throw new ApiError('Invalid OTP', 400);
            }
            if (user.otpExpiresAt < new Date() && otp !== staticOTP) { // Skip expiration check for static OTP
                throw new ApiError('OTP has expired', 400);
            }

            // Clear OTP and expiration time
            user.otp = null;
            user.otpExpiresAt = null;

            // Save device token and device ID
            user.deviceToken = deviceToken;
            user.deviceId = deviceId;
            await user.save();

            // Generate JWT token
            const token = jwt.sign({ id: user._id, number: user.number }, ACCESS_TOKEN_SECRET, {
                expiresIn: '20d', // Token expires in 20 days
            });

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                token, // Send the token in the response
                data: user,
            });
        } else {
            // If user does not exist, verify OTP from the OTP collection
            const otpRecord = await Otp.findOne({ number });
            // Check if OTP record exists and matches the provided OTP (or static OTP)
            if (!otpRecord || (otpRecord.otp !== otp && otp !== staticOTP)) {
                throw new ApiError('Invalid OTP', 400);
            }
            if (otpRecord?.createdAt < new Date(Date.now() - 10 * 60 * 1000) && otp !== staticOTP) { // Skip expiration check for static OTP
                throw new ApiError('OTP has expired', 400);
            }

            // Create a new user with default values
            const newUser = new User({
                number,
                is_profile_complete: false, // New user, profile is incomplete
                deviceToken, // Save device token
                deviceId, // Save device ID
            });
            await newUser.save();

            // Generate JWT token
            const token = jwt.sign({ id: newUser._id, number: newUser.number }, ACCESS_TOKEN_SECRET, {
                expiresIn: '2d', // Token expires in 2 days
            });

            // Delete the OTP record (if it exists and is not static OTP)
            if (otpRecord) {
                await Otp.deleteOne({ number });
            }

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                token, // Send the token in the response
                data: newUser,
            });
        }
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = req.user; // User is attached to the request by authenticateUser middleware

        // Exclude sensitive fields like password and OTP
        const userData = user.toObject();
        delete userData.otp;
        delete userData.otpExpiresAt;

        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: userData,
        });
    } catch (error) {
        next(error);
    }
};

// Multer setup for single file upload (profile image)
const uploadProfileImage = getFileUploader('profile_img', 'profile_images');

const updateProfile = async (req, res, next) => {
    let profileImgPath = '';

    uploadProfileImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err); // Log Multer errors
            return next(new ApiError(err.message, 400)); // Return the error through next middleware
        }

        try {
            const updateData = req.body;

            // Find the user
            const user = await User.findById(req.user._id);
            if (!user) {
                throw new ApiError('User not found', 404);
            }

            // Save new file path if a file is uploaded
            if (req.file) {
                profileImgPath = `/profile_images/${req.file.filename}`;
                updateData.profile_img = profileImgPath;
            }

            updateData.is_profile_complete = true;

            // Update the user profile
            const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

            // Delete old profile image if a new one is uploaded
            if (req.file && user.profile_img) {
                await deleteFile(user.profile_img);
            }

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser,
            });
        } catch (error) {
            // Delete uploaded file if an error occurs
            if (profileImgPath) {
                await deleteFile(profileImgPath);
            }

            console.error('Error here:', error); // Log the error
            return next(error); // Pass the error to the global error handler
        }
    });
};

const logout = async (req, res, next) => {
    try {
        const user = req.user; // User is attached to the request by authenticateUser middleware

        // Clear device token and device ID
        user.deviceToken = '';
        user.deviceId = '';
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    verifyOTP,
    getProfile,
    updateProfile,
    logout,
};