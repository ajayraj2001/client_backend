const { ApiError } = require('../../errorHandler');
const { CallChatHistory, Astrologer, User } = require('../../models');

const getCallHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let filter = {};

    if (startDate || endDate) {
      filter.created_at = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) } : {}),
      };
    }

    if (search) {
      const astrologers = await Astrologer.find({
        number: { $regex: search, $options: 'i' },
      }).select('_id');

      const users = await User.find({
        number: { $regex: search, $options: 'i' },
      }).select('_id');

      filter.$or = [
        { astrologer_id: { $in: astrologers.map(a => a._id) } },
        { user_id: { $in: users.map(u => u._id) } },
      ];
    }

    const [callHistory, totalRecords] = await Promise.all([
      CallChatHistory.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('astrologer_id', 'name number')
        .populate('user_id', 'name number'),
      CallChatHistory.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Call history fetched successfully',
      data: callHistory,
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

module.exports = { getCallHistory };
