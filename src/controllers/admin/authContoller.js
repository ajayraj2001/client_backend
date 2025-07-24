const moment = require('moment');
const { ApiError } = require('../../errorHandler');
const { Admin, AdminCommissionHistory, User, AstrologerWalletHistory, UserWalletHistory, CallChatHistory } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getOtp } = require('../../utils');
const { sendOtpEmail } = require('../../utils/sendEmail');

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

const getAdminDashboardStats = async (req, res, next) => {
    try {
        const { type = 'today' } = req.query; // 'today' or 'total' passed in the query
        let callRevenue, totalCalls, pujaRevenue, pujaUnits, productRevenue, productUnits;


        if (type === 'today') {
            // Get the current date (start of the day)
            const startDate = new Date().setUTCHours(0, 0, 0, 0);;
            const endDate = new Date().setUTCHours(23, 59, 59, 999);

            // const query = {
            //     created_at: {
            //         $gte: startDate, // Start of today
            //         $lte: endDate    // End of today
            //     }
            // };
            // Fetch today's user count
            // userCount = await User.countDocuments(query);

            // Fetch today's call revenue and call count from AdminCommission
            const callStats = await AdminCommissionHistory.aggregate([
                {
                    $match: {
                        timestamp: {
                            $gte: startDate,
                            $lte: endDate
                        }
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

            callRevenue = callStats.length > 0 ? callStats[0].totalRevenue : 0;
            totalCalls = callStats.length > 0 ? callStats[0].totalCalls : 0;

            // Static data for puja and product revenue
            pujaRevenue = 2000; // Static puja revenue for today
            pujaUnits = 200;    // Static puja units for today
            productRevenue = 45000; // Static product revenue for today
            productUnits = 1500; // Static product units for today
        } else if (type === 'total') {
            // Fetch total user count
            // userCount = await User.countDocuments();

            // Fetch total call revenue and call count from AdminCommission
            const callStats = await AdminCommissionHistory.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$amount" },
                        totalCalls: { $sum: 1 }
                    }
                }
            ]);

            callRevenue = callStats.length > 0 ? callStats[0].totalRevenue : 0;
            totalCalls = callStats.length > 0 ? callStats[0].totalCalls : 0;

            // Static data for puja and product revenue
            pujaRevenue = 2000; // Static puja revenue
            pujaUnits = 200;    // Static puja units
            productRevenue = 45000; // Static product revenue
            productUnits = 1500; // Static product units
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameter, use "today" or "total" for type.'
            });
        }

        // Calculate total revenue (call + puja + product revenue)
        const totalRevenue = callRevenue + pujaRevenue + productRevenue;

        return res.status(200).json({
            success: true,
            message: 'Admin dashboard stats fetched successfully',
            data: {
                call: {
                    revenue: callRevenue,
                    total: totalCalls,
                },
                puja: {
                    revenue: pujaRevenue,
                    total: pujaUnits,
                },
                product: {
                    revenue: productRevenue,
                    total: productUnits,
                },
                totalRevenue: {
                    revenue: totalRevenue,
                    total: totalCalls + pujaUnits + productUnits, // Total count for all (calls + puja + products)
                },
                // user: {
                //     total: userCount,
                // }
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAdminDashboardChartData = async (req, res, next) => {
    try {
        const { type = 'call', timePeriod = 'this_week' } = req.query;

        let startDate, endDate, isYearly = false;
        // Start with local time instead of UTC
        const now = moment();

        switch (timePeriod) {
            case 'this_week':
                startDate = now.clone().startOf('isoWeek').startOf('day').toDate();
                endDate = now.clone().endOf('isoWeek').startOf('day').toDate();
                break;
            case 'last_week':
                startDate = now.clone().subtract(1, 'weeks').startOf('isoWeek').startOf('day').toDate();
                endDate = now.clone().subtract(1, 'weeks').endOf('isoWeek').startOf('day').toDate();
                break;
            case 'this_month':
                startDate = now.clone().startOf('month').startOf('day').toDate();
                endDate = now.clone().endOf('month').startOf('day').toDate();
                break;
            case 'last_month':
                startDate = now.clone().subtract(1, 'months').startOf('month').startOf('day').toDate();
                endDate = now.clone().subtract(1, 'months').endOf('month').startOf('day').toDate();
                break;
            case 'this_year':
                startDate = now.clone().startOf('year').startOf('day').toDate();
                endDate = now.clone().endOf('year').startOf('day').toDate();
                isYearly = true;
                break;
            case 'last_year':
                startDate = now.clone().subtract(1, 'years').startOf('year').startOf('day').toDate();
                endDate = now.clone().subtract(1, 'years').endOf('year').startOf('day').toDate();
                isYearly = true;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timePeriod. Use this_week, last_week, this_month, last_month, this_year, last_year.',
                });
        }

        // Adjust the query to use date-only comparison
        let matchQuery = {
            $expr: {
                $and: [
                    {
                        $gte: [{ $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        moment(startDate).format('YYYY-MM-DD')]
                    },
                    {
                        $lte: [{ $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        moment(endDate).format('YYYY-MM-DD')]
                    }
                ]
            }
        };

        let responseData = {
            revenueBreakdown: {},
            totalRevenue: 0,
            revenueData: [],
        };

        let dateMap = {};

        if (isYearly) {
            for (let i = 0; i < 12; i++) {
                let month = moment().month(i).format('MMMM');
                dateMap[month] = {
                    month: month,
                    revenue: 0,
                };
            }
        } else {
            let currentDate = moment(startDate).startOf('day');
            const endMoment = moment(endDate).startOf('day');

            while (currentDate.isSameOrBefore(endMoment, 'day')) {
                const dateStr = currentDate.format('YYYY-MM-DD');
                dateMap[dateStr] = {
                    date: dateStr,
                    day: currentDate.format('dddd'),
                    revenue: 0,
                };
                currentDate.add(1, 'day');
            }
        }

        const aggregateData = async (collection, key) => {
            const groupStage = isYearly
                ? {
                    $group: {
                        _id: {
                            month: { $month: '$timestamp' },
                            year: { $year: '$timestamp' }
                        },
                        totalRevenue: { $sum: '$amount' }
                    }
                }
                : {
                    $group: {
                        _id: {
                            date: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$timestamp'
                                }
                            }
                        },
                        totalRevenue: { $sum: '$amount' }
                    }
                };

            const data = await collection.aggregate([
                { $match: matchQuery },
                groupStage,
                { $sort: { '_id': 1 } }
            ]);

            // For debugging
            console.log('Date Range:', {
                startDate: moment(startDate).format('YYYY-MM-DD'),
                endDate: moment(endDate).format('YYYY-MM-DD'),
                matchedRecords: data.length
            });

            data.forEach((item) => {
                if (isYearly) {
                    let month = moment().month(item._id.month - 1).format('MMMM');
                    if (dateMap[month]) {
                        dateMap[month].revenue += item.totalRevenue;
                    }
                } else {
                    if (dateMap[item._id.date]) {
                        dateMap[item._id.date].revenue += item.totalRevenue;
                    }
                }
            });

            responseData.revenueBreakdown[key] = data.reduce((acc, item) => acc + item.totalRevenue, 0);
            responseData.totalRevenue += responseData.revenueBreakdown[key];
        };

        if (type === 'overall' || type === 'call') await aggregateData(AdminCommissionHistory, 'call');
        if (type === 'overall' || type === 'puja') await aggregateData(PujaBookings, 'puja');
        if (type === 'overall' || type === 'product') await aggregateData(Orders, 'product');

        responseData.revenueData = Object.values(dateMap);

        return res.status(200).json({
            success: true,
            message: 'Revenue chart data fetched successfully',
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

// const getAdminDashboardChartData = async (req, res, next) => {
//     try {
//         const { type = 'call', timePeriod = 'this_month' } = req.query;

//         let startDate, endDate, isYearly = false;
//         const now = moment().utc();

//         switch (timePeriod) {
//             case 'this_week':
//                 startDate = now.clone().startOf('isoWeek').toDate();
//                 endDate = now.clone().endOf('isoWeek').toDate();
//                 break;
//             case 'last_week':
//                 startDate = now.clone().subtract(1, 'weeks').startOf('isoWeek').toDate();
//                 endDate = now.clone().subtract(1, 'weeks').endOf('isoWeek').toDate();
//                 break;
//             case 'this_month':
//                 startDate = now.clone().startOf('month').toDate();
//                 endDate = now.clone().endOf('month').toDate();
//                 break;
//             case 'last_month':
//                 startDate = now.clone().subtract(1, 'months').startOf('month').toDate();
//                 endDate = now.clone().subtract(1, 'months').endOf('month').toDate();
//                 break;
//             case 'this_year':
//                 startDate = now.clone().startOf('year').toDate();
//                 endDate = now.clone().endOf('year').toDate();
//                 isYearly = true;
//                 break;
//             case 'last_year':
//                 startDate = now.clone().subtract(1, 'years').startOf('year').toDate();
//                 endDate = now.clone().subtract(1, 'years').endOf('year').toDate();
//                 isYearly = true;
//                 break;
//             default:
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Invalid timePeriod. Use this_week, last_week, this_month, last_month, this_year, last_year.',
//                 });
//         }

//         let matchQuery = {
//             timestamp: {
//                 $gte: startDate,
//                 $lte: endDate,
//             },
//         };

//         let responseData = {
//             revenueBreakdown: {},
//             totalRevenue: 0,
//             revenueData: [],
//         };

//         let dateMap = {};

//         if (isYearly) {
//             for (let i = 0; i < 12; i++) {
//                 let month = moment().month(i).format('MMMM');
//                 dateMap[month] = {
//                     month: month,
//                     revenue: 0,
//                 };
//             }
//         } else {
//             let currentDate = moment(startDate);
//             while (currentDate.isSameOrBefore(moment(endDate), 'day')) {
//                 dateMap[currentDate.format('YYYY-MM-DD')] = {
//                     date: currentDate.format('YYYY-MM-DD'),
//                     day: currentDate.format('dddd'),
//                     revenue: 0,
//                 };
//                 currentDate.add(1, 'day');
//             }
//         }

//         const aggregateData = async (collection, key) => {
//             const groupStage = isYearly
//                 ? {
//                     $group: {
//                         _id: {
//                             month: { $month: '$timestamp' },
//                             year: { $year: '$timestamp' }
//                         },
//                         totalRevenue: { $sum: '$amount' }
//                     }
//                 }
//                 : {
//                     $group: {
//                         _id: {
//                             date: {
//                                 $dateToString: {
//                                     format: '%Y-%m-%d',
//                                     date: '$timestamp'
//                                 }
//                             }
//                         },
//                         totalRevenue: { $sum: '$amount' }
//                     }
//                 };

//             const data = await collection.aggregate([
//                 { $match: matchQuery },
//                 groupStage,
//                 { $sort: { '_id': 1 } }
//             ]);

//             data.forEach((item) => {
//                 if (isYearly) {
//                     let month = moment().month(item._id.month - 1).format('MMMM');
//                     if (dateMap[month]) {
//                         dateMap[month].revenue += item.totalRevenue;
//                     }
//                 } else {
//                     if (dateMap[item._id.date]) {
//                         dateMap[item._id.date].revenue += item.totalRevenue;
//                     }
//                 }
//             });

//             responseData.revenueBreakdown[key] = data.reduce((acc, item) => acc + item.totalRevenue, 0);
//             responseData.totalRevenue += responseData.revenueBreakdown[key];
//         };

//         if (type === 'overall' || type === 'call') await aggregateData(AdminCommissionHistory, 'call');
//         if (type === 'overall' || type === 'puja') await aggregateData(PujaBookings, 'puja');
//         if (type === 'overall' || type === 'product') await aggregateData(Orders, 'product');

//         responseData.revenueData = Object.values(dateMap);

//         return res.status(200).json({
//             success: true,
//             message: 'Revenue chart data fetched successfully',
//             data: responseData,
//         });
//     } catch (error) {
//         next(error);
//     }
// };


// const getAdminDashboardExtendedStats = async (req, res, next) => {
//     try {
//         const { type = 'today' } = req.query;
//         let  callRevenue, totalCalls, pujaRevenue, pujaUnits, productRevenue, productUnits;
//         let astrologerEarnings, astrologerTotal, userRecharges, userRechargeTotal;

//         const startDate = type === 'today' ? new Date().setUTCHours(0, 0, 0, 0) : null;
//         const endDate = type === 'today' ? new Date().setUTCHours(23, 59, 59, 999) : null;

//         const matchQuery = type === 'today' ? { timestamp: { $gte: startDate, $lte: endDate } } : {};

//         const callStats = await AdminCommissionHistory.aggregate([
//             { $match: matchQuery },
//             { $group: { _id: null, totalRevenue: { $sum: "$amount" }, totalCalls: { $sum: 1 } } }
//         ]);

//         callRevenue = callStats.length > 0 ? callStats[0].totalRevenue : 0;
//         totalCalls = callStats.length > 0 ? callStats[0].totalCalls : 0;

//         pujaRevenue = 2000;
//         pujaUnits = 200;
//         productRevenue = 45000;
//         productUnits = 1500;

//         const astroStats = await AstrologerWalletHistory.aggregate([
//             { $match: { ...matchQuery, transaction_type: 'credit' } },
//             { $group: { _id: null, totalEarnings: { $sum: "$amount" }, totalTransactions: { $sum: 1 } } }
//         ]);

//         astrologerEarnings = astroStats.length > 0 ? astroStats[0].totalEarnings : 0;
//         astrologerTotal = astroStats.length > 0 ? astroStats[0].totalTransactions : 0;

//         const userRechargeStats = await UserWalletHistory.aggregate([
//             { $match: { ...matchQuery, transaction_type: 'credit', status: 'success' } },
//             { $group: { _id: null, totalRecharges: { $sum: "$amount" }, totalTransactions: { $sum: 1 } } }
//         ]);

//         userRecharges = userRechargeStats.length > 0 ? userRechargeStats[0].totalRecharges : 0;
//         userRechargeTotal = userRechargeStats.length > 0 ? userRechargeStats[0].totalTransactions : 0;

//         const totalRevenue = callRevenue + pujaRevenue + productRevenue;

//         return res.status(200).json({
//             success: true,
//             message: 'Extended admin dashboard stats fetched successfully',
//             data: {
//                 call: { revenue: callRevenue, total: totalCalls },
//                 puja: { revenue: pujaRevenue, total: pujaUnits },
//                 product: { revenue: productRevenue, total: productUnits },
//                 astrologerEarnings: { revenue: astrologerEarnings, total: astrologerTotal },
//                 userRecharges: { revenue: userRecharges, total: userRechargeTotal },
//                 totalRevenue: { revenue: totalRevenue, total: totalCalls + pujaUnits + productUnits },
//             }
//         });
//     } catch (error) {
//         next(error);
//     }
// };

module.exports = {
    login,
    changePassword,
    forgotPassword,
    getProfile,
    resetPassword,
    verifyOtp,
    getAdminDashboardStats,
    getAdminDashboardChartData,
};
