const { ApiError } = require('../../errorHandler');
const { ChatMessage } = require('../../models');

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

module.exports = { getLastChats };