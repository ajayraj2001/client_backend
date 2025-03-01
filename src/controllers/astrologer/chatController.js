const { ApiError } = require('../../errorHandler');
const { ChatMessage, CallChatHistory, Astrologer } = require('../../models');

// Get last chats for a user or astrologer
const getLastChats = async (req, res, next) => {
  try {
    const astrologer_id = req.astrologer._id;
    const { user_id } = req.query;

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
    const astrologer_id = req.astrologer._id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 30; // 30 records per page

    // Validate call_type
    if (!['chat', 'voice', 'video'].includes(call_type)) {
      throw new ApiError('Invalid call type', 400);
    }

    // Fetch the call history with pagination
    const callHistory = await CallChatHistory.find({ astrologer_id, call_type })
      .sort({ start_time: -1 }) // Sort by latest first
      .skip((page - 1) * limit) // Skip records for previous pages
      .limit(limit) // Limit to 30 records per page
      .populate('user_id', 'name profile_img'); // Include astrologer details

    // Get total number of records for pagination metadata
    const totalRecords = await CallChatHistory.countDocuments({ astrologer_id, call_type });

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

const updateAstrologerOnlineStatus = async (req, res, next) => {
  try {
    const astrologer_id = req.astrologer._id; // Get from authenticated user
    const { is_chat_online, is_voice_online } = req.body; // Get values from request

    // Fetch astrologer with required fields
    const astrologer = await Astrologer.findById(astrologer_id).select("is_chat is_voice_call is_chat_online is_voice_online");

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    // Validate online status update
    const updates = {};

    if (is_chat_online !== undefined) {
      if (astrologer.is_chat === "on") {
        updates.is_chat_online = is_chat_online;
      } else {
        throw new ApiError("Cannot go online for chat as chat service is disabled", 400);
      }
    }

    if (is_voice_online !== undefined) {
      if (astrologer.is_voice_call === "on") {
        updates.is_voice_online = is_voice_online;
      } else {
        throw new ApiError("Cannot go online for voice as voice call service is disabled", 400);
      }
    }

    // If no valid updates, return an error
    if (Object.keys(updates).length === 0) {
      throw new ApiError("No valid fields to update", 400);
    }

    // Update astrologer status
    await Astrologer.findByIdAndUpdate(astrologer_id, { $set: updates });

    // Return updated response
    res.json({
      success: true,
      message: "Astrologer online status updated successfully",
      data: updates
    });

  } catch (error) {
    next(error);
  }
};


module.exports = { getLastChats, getCallHistory, updateAstrologerOnlineStatus };