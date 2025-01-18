const { ApiError } = require('../../errorHandler');
const { ChatMessage, CallChatHistory } = require('../../models');

// Get last chats for a user or astrologer
const getLastChats = async (req, res, next) => {
    try {
        const { user_id, astrologer_id } = req.query;

        // Validate input
        if (!user_id && !astrologer_id) {
            throw new ApiError('Either user_id or astrologer_id is required', 400);
        }

        // Fetch last chats
        const lastChats = await ChatMessage.aggregate([
            {
                $match: {
                    ...(user_id && { user_id: mongoose.Types.ObjectId(user_id) }),
                    ...(astrologer_id && { astrologer_id: mongoose.Types.ObjectId(astrologer_id) }),
                },
            },
            {
                $sort: { timestamp: -1 }, // Sort by timestamp in descending order
            },
            {
                $group: {
                    _id: {
                        user_id: '$user_id',
                        astrologer_id: '$astrologer_id',
                    },
                    lastMessage: { $first: '$$ROOT' }, // Get the first message (most recent) for each group
                },
            },
            {
                $project: {
                    _id: 0,
                    user_id: '$_id.user_id',
                    astrologer_id: '$_id.astrologer_id',
                    lastMessage: {
                        message: '$lastMessage.message',
                        sender: '$lastMessage.sender',
                        timestamp: '$lastMessage.timestamp',
                    },
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            message: 'Last chats fetched successfully',
            data: lastChats,
        });
    } catch (error) {
        next(error);
    }
};

const getCallHistory = async (req, res, next) => {
  try {
    const { call_type } = req.body;
    const user_id = req.user._id; // User ID from middleware
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 30; // 30 records per page

    // Validate call_type
    if (!['chat', 'voice', 'video'].includes(call_type)) {
      throw new ApiError('Invalid call type', 400);
    }

    // Fetch the call history with pagination
    const callHistory = await CallChatHistory.find({ user_id, call_type })
      .sort({ start_time: -1 }) // Sort by latest first
      .skip((page - 1) * limit) // Skip records for previous pages
      .limit(limit) // Limit to 30 records per page
      .populate('astrologer_id', 'name profile_img'); // Include astrologer details

    // Get total number of records for pagination metadata
    const totalRecords = await CallChatHistory.countDocuments({ user_id, call_type });

    return res.status(200).json({
      success: true,
      message: 'Call history fetched successfully',
      data: {
        callHistory: callHistory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLastChats ,getCallHistory};