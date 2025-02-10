const { ApiError } = require('../../errorHandler');
const { User, UserWalletHistory } = require('../../models');

const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const statusFilter = req.query.status || { $exists: true }; // Default: no filter
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        // Build the search query
        const searchQuery = {
            $and: [
                { status: statusFilter },
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } }, // Case-insensitive search by name
                        { number: { $regex: search, $options: 'i' } }, // Case-insensitive search by number
                    ]
                }
            ]
        };

        // Add date filter if provided
        if (startDate || endDate) {
            searchQuery.$and.push({
                created_at: {
                    $gte: startDate || new Date(0),
                    $lte: endDate ? new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) : new Date()
                }
            });
        }

        // Fetch users with search, date filter, and pagination
        const users = await User.find(searchQuery)
            .sort({ [sortBy]: sortOrder }) // Dynamic sorting
            .skip(skip)
            .limit(limit)
            .select('name email number status wallet profile_img dob created_at'); // Select required fields

        // Count total users matching the search query
        const total = await User.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            data: {
                users,
                total,
                page,
                limit
            }
        });
    } catch (error) {
        next(error);
    }
};

const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['Active', 'Inactive'].includes(status)) {
            throw new ApiError('Invalid status', 400);
        }

        // Find and update the astrologer status
        const user = await User.findByIdAndUpdate(id, { status }, { new: true });

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

const getWalletHistory = async (req, res, next) => {
    try {
        const { id } = req.params; // User ID from params
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
        const walletHistory = await UserWalletHistory.find({
            user_id: id,
            ...dateFilter,
        })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Fetch total count for pagination
        const totalRecords = await UserWalletHistory.countDocuments({
            user_id: id,
            ...dateFilter,
        });

        // Fetch the user's current wallet balance
        const user = await User.findById(id).select('wallet');

        return res.status(200).json({
            success: true,
            message: 'Wallet history fetched successfully',
            data: {
                currentBalance: user?.wallet || 0, // Handle case where user not found
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


module.exports = {
    getUsers,
    updateUserStatus,
    getWalletHistory
}