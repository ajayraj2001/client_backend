const mongoose = require('mongoose')
const { ApiError } = require('../../errorHandler');
const { ChatMessage, CallChatHistory, Astrologer } = require('../../models');

// Get last chats for a user or astrologer
const getLastChats = async (req, res, next) => {
  try {
    // const astrologer_id = req.astrologer?._id;
    const astrologer_id = '67b2e48b094a099dcf83352b';
    let user_id = "67a083c23964cf8d5a46462e"
    const {  page = 1, limit = 10 } = req.query;

    if (!user_id && !astrologer_id) {
      throw new ApiError('Either user_id or astrologer_id is required', 400);
    }

    const matchQuery = {};
    if (user_id) matchQuery.user_id = new mongoose.Types.ObjectId(user_id);
    if (astrologer_id) matchQuery.astrologer_id = new mongoose.Types.ObjectId(astrologer_id);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const result = await ChatMessage.aggregate([
      { $match: matchQuery },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            user_id: '$user_id',
            astrologer_id: '$astrologer_id',
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $facet: {
          data: [
            { $sort: { 'lastMessage.timestamp': -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $project: {
                _id: 0,
                user_id: '$_id.user_id',
                astrologer_id: '$_id.astrologer_id',
                message: '$lastMessage.message',
                sender: '$lastMessage.sender',
                timestamp: '$lastMessage.timestamp',
              },
            },
          ],
          totalCount: [
            { $count: 'total' },
          ],
        },
      },
    ]);

    const chats = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Last chats fetched successfully',
      data: chats,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAstrologerMessages = async (req, res, next) => {
  try {
     const astrologer_id = '67b2e48b094a099dcf83352b';
    let user_id = "67a083c23964cf8d5a46462e"
    // const astrologer_id = req.astrologer?._id 
    const { page = 1, limit = 20 } = req.query;

    const matchQuery = {
      astrologer_id: new mongoose.Types.ObjectId(astrologer_id),
    };

    if (user_id) {
      matchQuery.user_id = new mongoose.Types.ObjectId(user_id);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Count total messages (for pagination)
    const totalMessages = await ChatMessage.countDocuments(matchQuery);

    // Fetch paginated messages
    const messages = await ChatMessage.find(matchQuery)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('user_id astrologer_id message sender timestamp read messageType') // include only essential fields
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

const getCallHistory = async (req, res, next) => {
  try {
    const { call_type } = req.query;
    const astrologer_id = req.astrologer._id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10; // 10 records per page

    // Build the query dynamically
    const query = { astrologer_id };
    if (call_type) {
      if (!['chat', 'voice', 'video'].includes(call_type)) {
        throw new ApiError('Invalid call type', 400);
      }
      query.call_type = call_type;
    }

    // Fetch the call history with pagination
    const callHistory = await CallChatHistory.find(query)
      .sort({ start_time: -1 }) // Sort by latest first
      .skip((page - 1) * limit) // Skip records for previous pages
      .limit(limit) // Limit to 30 records per page
      .select('-cost -admin_cut') // Exclude these fields
      .populate('user_id', 'name profile_img'); // Include user details

    // Get total number of records for pagination metadata
    const totalRecords = await CallChatHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Call history fetched successfully',
      data: {
        callHistory,
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

/**
 * Get chat list for an astrologer showing all users they've chatted with and the last message
 * Similar to a WhatsApp chat list UI
 */
const getChatList = async (req, res, next) => {
  try {
    const astrologer_id = '67b2e48b094a099dcf83352b'
    // const astrologer_id = req.astrologer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Aggregate to get the last message for each user that has chatted with this astrologer
    const chatList = await ChatMessage.aggregate([
      // Match all messages involving this astrologer
      {
        $match: {
          astrologer_id: new mongoose.Types.ObjectId(astrologer_id)
        }
      },
      // Sort by timestamp (newest first)
      {
        $sort: { timestamp: -1 }
      },
      // Group by user_id to get one entry per user
      {
        $group: {
          _id: "$user_id",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$sender", "user"] },
                  { $eq: ["$read", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      // Look up user info
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      // Unwind the user info array (convert to object)
      {
        $unwind: "$userInfo"
      },
      // Sort by last message timestamp
      {
        $sort: { "lastMessage.timestamp": -1 }
      },
      // Skip and limit for pagination
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      // Project only the fields we need
      {
        $project: {
          _id: 0,
          user_id: "$_id",
          name: "$userInfo.name",
          profile_img: "$userInfo.profile_img",
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

    // Get total count for pagination
    const totalUsers = await ChatMessage.aggregate([
      { $match: { astrologer_id: new mongoose.Types.ObjectId(astrologer_id) } },
      { $group: { _id: "$user_id" } },
      { $count: "total" }
    ]);

    const total = totalUsers.length > 0 ? totalUsers[0].total : 0;

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


module.exports = { getLastChats, getCallHistory, updateAstrologerOnlineStatus, getChatList , getAstrologerMessages};