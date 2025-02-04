const { ApiError } = require('../../errorHandler');
const { User } = require('../../models');

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

module.exports = { getUsers,updateUserStatus }