const { ApiError } = require('../../errorHandler');
const { Admin, AdminCommissionHistory } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getOtp } = require('../../utils');
const {sendOtpEmail} = require('../../utils/sendEmail');

const { ACCESS_TOKEN_SECRET } = process.env;

const login = async (req, res, next) => {
    try {
        let { email, password } = req.body;
        if (!email) throw new ApiError('Email is Required', 403);

        if (!password) throw new ApiError('Password is Required', 403);

        // const admin = await Admin.findOne({ $or: [{ phone: phone_or_email }, { email: phone_or_email }] });
        const admin = await Admin.findOne({ email: email });
        if (!admin) throw new ApiError('Invalid credentials', 403);

        if (admin.status === 'Inactive') {
            throw new ApiError('Your Account is Inactive, Contact to Admin', 403);
        }

        const match = await bcrypt.compare(password, admin.password);
        if (!match) throw new ApiError('Invalid credentials', 403);

        // Generate JWT token
        const token = jwt.sign({ id: admin._id, email: admin.email }, ACCESS_TOKEN_SECRET, {
            expiresIn: '5d',
        });
        // Exclude the password before sending the response
        const adminData = admin.toObject();
        delete adminData.password;

        // If the password matches, return success
        return res.status(200).json({
            success: true,
            token,
            user: adminData,
            message: 'Login successfully'
        });
    } catch (error) {
        console.log('error', error)
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const adminId = req.admin._id

        // Validate input
        if (!oldPassword || !newPassword) {
            throw new ApiError('Old password, and new password are required', 400);
        }

        // Find the admin by email
        const admin = await Admin.findById(adminId);
        if (!admin) {
            throw new ApiError('Admin not found', 404);
        }

        if (admin.status === 'Inactive') {
            throw new ApiError('Your Account is Inactive, Contact to Admin', 403);
        }

        // Compare oldPassword with the current password
        const isMatch = await bcrypt.compare(oldPassword, admin.password);
        if (!isMatch) {
            throw new ApiError('Old password is incorrect', 401);
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the admin's password
        admin.password = hashedPassword;
        await admin.save();

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.log('error', error)
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) throw new ApiError('Email is required', 400);

        const admin = await Admin.findOne({ email: email });

        if (!admin) throw new ApiError('Admin not found with this email', 404);

        if (admin.status === 'Inactive') {
            throw new ApiError('Your Account is Inactive, Contact to Admin', 403);
        }

        const otp = getOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        admin.otp = otp;
        admin.otp_expiry = otpExpiry;
        await admin.save();

        // Send OTP via email using Nodemailer
        await sendOtpEmail(admin.email, otp);

        return res.status(200).json({
            success: true,
            message: `OTP has been sent to your registered email ${admin.email}`
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        // Find the admin by their ID
        const admin = await Admin.findById(req.admin._id).select('-password');

        // If admin is not found, return an error
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found',
            });
        }

        // Return the admin's profile
        return res.status(200).json({
            success: true,
            message: 'Admin Profile',
            user: admin
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

        // Find the admin by email
        const admin = await Admin.findOne({ email });
        if (!admin) throw new ApiError('Admin not found', 404);

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the admin's password
        admin.password = hashedPassword;
        admin.otp = null; // Clear the OTP after successful password reset
        admin.otp_expiry = null;
        await admin.save();

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully',
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

        // Find the admin by phone or email
        const admin = await Admin.findOne({ email: email });
        if (!admin) throw new ApiError('Admin not found', 404);

        // Validate OTP
        if (Date.now() > new Date(admin.otp_expiry).getTime()) throw new ApiError('OTP expired', 400);
        if (admin.otp !== otp) throw new ApiError('Invalid OTP', 400);

        // If OTP is valid, return success response
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Admin Dashboard API
const getAdminDashboardStats = async (req, res, next) => {
    try {
        // Get the current date in IST (Indian Standard Time)
        const todayIST = moment().startOf('day');  // No need for tz() as timestamps are saved in IST
        const tomorrowIST = moment(todayIST).add(1, 'day');

        // Fetch today's user signups
        const todayUserCount = await User.countDocuments({
            created_at: { $gte: todayIST.toDate(), $lt: tomorrowIST.toDate() }
        });

        // Fetch today's call revenue and count from AdminCommission
        const callStats = await AdminCommission.aggregate([
            {
                $match: {
                    timestamp: { $gte: todayIST.toDate(), $lt: tomorrowIST.toDate() }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    totalCalls: { $sum: 1 }
                }
            }
        ]);

        const callRevenue = callStats.length > 0 ? callStats[0].totalRevenue : 0;
        const totalCalls = callStats.length > 0 ? callStats[0].totalCalls : 0;

        // Handle date range search (startDate and endDate from query params)
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let searchQuery = {};
        if (startDate || endDate) {
            const parsedStartDate = new Date(startDate);
            const parsedEndDate = endDate ? new Date(endDate) : new Date();
            searchQuery.$and = [{
                created_at: {
                    $gte: parsedStartDate || new Date(0),
                    $lte: endDate ? new Date(new Date(parsedEndDate).setUTCHours(23, 59, 59, 999)) : new Date()
                }
            }];
        }

        // Fetch paginated user data based on start and end date range
        const users = await User.find(searchQuery)
            .skip(skip)
            .limit(parseInt(limit));

        // Fetch total records for pagination
        const totalRecords = await User.countDocuments(searchQuery);

        return res.status(200).json({
            success: true,
            message: 'Admin dashboard stats fetched successfully',
            data: {
                todayUserSignups: todayUserCount,
                todayCallRevenue: callRevenue,
                todayTotalCalls: totalCalls,
                todayPujaRevenue: 5000, // Static for now
                todayPujaUnits: 10, // Static for now
                todayProductRevenue: 10000, // Static for now
                todayProductUnits: 15, // Static for now
                users,  // Paginated users
            },
            pagination: {
                totalRecords,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / parseInt(limit)),
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, changePassword, forgotPassword, getProfile, resetPassword, verifyOtp, getAdminDashboardStats };
