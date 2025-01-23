const { ApiError } = require('../../errorHandler');
const { Astrologer } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { getOtp } = require('../../utils');
const sendOtpEmail = require('../../utils/sendOtpToEmail');

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

        // Find the astrologer by email
        const astrologer = await Astrologer.findOne({ email });
        if (!astrologer) throw new ApiError('Astrologer not found', 404);

        // Validate OTP
        if (Date.now() > new Date(astrologer.otp_expiry).getTime()) throw new ApiError('OTP expired', 400);
        if (astrologer.otp !== otp) throw new ApiError('Invalid OTP', 400);

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
    try {
        const { name, number, email, password, about, experience, address, languages, state, city, skills } = req.body;

        if (!name || !number || !email || !password) {
            throw new ApiError('Name, number, email, and password are required', 400);
        }

        // Check if the astrologer already exists
        const existingAstrologer = await Astrologer.findOne({ $or: [{ number }, { email }] });
        if (existingAstrologer) {
            throw new ApiError('Astrologer with this number or email already exists', 400);
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new astrologer with status 'Inactive'
        const astrologer = new Astrologer({
            name,
            number,
            email,
            password: hashedPassword,
            about,
            experience,
            address,
            languages,
            skills,
            state,
            city,
            status: 'Inactive',
        });

        await astrologer.save();

        // Notify admin (you can implement this function to send a notification to the admin)
        notifyAdmin(astrologer);

        // Remove password from the response
        const astrologerResponse = astrologer.toObject();
        delete astrologerResponse.password;

        return res.status(201).json({
            success: true,
            message: 'Astrologer registered successfully. Waiting for admin approval.',
            astrologer: astrologerResponse,
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

module.exports = {
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    signup,
};