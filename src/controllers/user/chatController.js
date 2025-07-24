const { ApiError } = require('../../errorHandler');
const { ChatMessage, CallChatHistory } = require('../../models');

// Get last chats for a user or astrologer
const getLastChats = async (req, res, next) => {
  try {
      const { user_id, astrologer_id, page = 1, pageSize = 20 } = req.query;

      // Validate input
      if (!user_id && !astrologer_id) {
          throw new ApiError('Either user_id or astrologer_id is required', 400);
      }

      // Calculate skip value for pagination
      const skip = (page - 1) * pageSize;

      // Fetch last chats with pagination
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
          { $skip: skip }, // Skip records for pagination
          { $limit: parseInt(pageSize) }, // Limit the number of records
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

const getUserMessages = async (req, res, next) => {
  try {
    const user_id = '67a083c23964cf8d5a46462e'; // Replace with: req.user?._id in production
    let astrologer_id = '67b2e48b094a099dcf83352b'; // Should come from query or params

    const { page = 1, limit = 20 } = req.query;

    const matchQuery = {
      user_id: new mongoose.Types.ObjectId(user_id),
    };

    if (astrologer_id) {
      matchQuery.astrologer_id = new mongoose.Types.ObjectId(astrologer_id);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Count total messages (for pagination)
    const totalMessages = await ChatMessage.countDocuments(matchQuery);

    // Fetch paginated messages
    const messages = await ChatMessage.find(matchQuery)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('user_id astrologer_id message sender timestamp read messageType') // only essential fields
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / limit),
        totalRecords: totalMessages
      }
    });

  } catch (error) {
    next(error);
  }
};

const getUserChatList = async (req, res, next) => {
  try {
    const user_id = '66210cb1f34de51875b04822'; // Replace with: req.user._id in production
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chatList = await ChatMessage.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id)
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$astrologer_id",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$sender", "astrologer"] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "astrologers",
          localField: "_id",
          foreignField: "_id",
          as: "astrologerInfo"
        }
      },
      {
        $unwind: "$astrologerInfo"
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          astrologer_id: "$_id",
          name: "$astrologerInfo.name",
          profile_img: "$astrologerInfo.profile_img",
          expertise: "$astrologerInfo.expertise",
          lastMessage: {
            message: "$lastMessage.message",
            sender: "$lastMessage.sender",
            timestamp: "$lastMessage.timestamp",
            read: "$lastMessage.read",
            messageType: "$lastMessage.messageType"
          },
          unreadCount: 1
        }
      }
    ]);

    const totalAstrologers = await ChatMessage.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(user_id) } },
      { $group: { _id: "$astrologer_id" } },
      { $count: "total" }
    ]);

    const total = totalAstrologers.length > 0 ? totalAstrologers[0].total : 0;

    return res.status(200).json({
      success: true,
      message: 'Chat list fetched successfully',
      data: {
        chatList,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
};


module.exports = { getLastChats, getCallHistory, getUserMessages, getUserChatList};