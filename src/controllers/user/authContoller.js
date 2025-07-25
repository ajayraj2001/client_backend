const { ApiError } = require('../../errorHandler');
const { User, Otp } = require('../../models');
const { sendOTP } = require('../../utils/sendOtpToPhone');
const { sendEmailOTP } = require('../../utils/sendEmail');
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
            // 🔒 Prevent login if user is inactive
            if (user.status === 'Inactive') {
                throw new ApiError('Your account is Inactive. Please contact support.', 403);
            }
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

        // if (!deviceToken || !deviceId) {
        //     throw new ApiError(' deviceToken, and deviceId are required', 400);
        // }

        // Static OTP for testing purposes
        const staticOTP = "6969"; // Define your static OTP here

        // Check if the user exists
        const user = await User.findOne({ number });
        if (user) {

            if (user.status === 'Inactive') {
                throw new ApiError('Your account is Inactive. Please contact support.', 403);
            }
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
        console.log('error', error)
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = req.user.toObject();

        const isEmailVerified = !!(user.email && (!user.pending_email || user.pending_email === user.email));

        const response = {
            ...user,
            email: user.pending_email || user.email,
            isEmailVerified,
        };

        // Remove sensitive fields
        delete response.otp;
        delete response.otpExpiresAt;
        delete response.email_otp;
        delete response.email_otp_expires_at;
        delete response.pending_email;

        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: response,
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
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        try {
            const updateData = req.body;
            const user = await User.findById(req.user._id);
            if (!user) throw new ApiError('User not found', 404);

            // Block phone number update
            if ('number' in updateData) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number cannot be updated.',
                });
            }

            // Handle image upload
            if (req.file) {
                profileImgPath = `/profile_images/${req.file.filename}`;
                updateData.profile_img = profileImgPath;
            }

            // Prevent direct email update
            if ('email' in updateData && updateData.email !== user.email) {
                updateData.pending_email = updateData.email;
                delete updateData.email;
            }

            updateData.is_profile_complete = true;

            const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

            if (req.file && user.profile_img) {
                await deleteFile(user.profile_img);
            }

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser,
            });
        } catch (error) {
            if (profileImgPath) await deleteFile(profileImgPath);
            console.error('Error:', error);
            return next(error);
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

const deleteProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Find and update user status
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { status: 'Inactive', otp: null },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile deactivated successfully',
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};

const sendEmailVerificationOtp = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        // const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otp = '6969'
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update user with email OTP
        const user = await User.findByIdAndUpdate(
            userId,
            {
                pending_email: email,
                email_otp: otp,
                email_otp_expires_at: otpExpiresAt,
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        await sendEmailOTP(email, otp); // uses your SMTP config & template

        return res.status(200).json({
            success: true,
            message: 'OTP sent to email successfully',
        });
    } catch (error) {
        next(error);
    }
};

const verifyEmailOtp = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required',
            });
        }

        const user = await User.findById(userId);

        if (
            !user ||
            user.email_otp !== otp ||
            !user.email_otp_expires_at ||
            user.email_otp_expires_at < new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP',
            });
        }

        // Update the email and clear OTP
        user.email = user.pending_email;
        user.pending_email = '';
        user.email_otp = '';
        user.email_otp_expires_at = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Email verified and updated successfully',
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
    deleteProfile,
    sendEmailVerificationOtp,
    verifyEmailOtp
};