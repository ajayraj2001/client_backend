const { ApiError } = require('../../errorHandler');
const { User, Astrologer, CallChatHistory } = require('../../models');

// Admin API to get all call/chat history with filters and pagination
const callHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, userSearch, astroSearch, page = 1, limit = 10 } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.created_at = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && { $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) })
      };
    }

    if (userSearch) {
      const user = await User.findOne({ $or: [{ name: { $regex: userSearch, $options: 'i' } }, { number: userSearch }] }).select('_id');
      if (user) query.user_id = user._id;
    }

    if (astroSearch) {
      const astrologer = await Astrologer.findOne({ $or: [{ name: { $regex: astroSearch, $options: 'i' } }, { email: { $regex: astroSearch, $options: 'i' } }, { number: astroSearch }] }).select('_id');
      if (astrologer) query.astrologer_id = astrologer._id;
    }

    const callHistory = await CallChatHistory.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user_id', 'name number')
      .populate('astrologer_id', 'name email number')
      .select('user_id astrologer_id call_type created_at duration status cost');

    const total = await CallChatHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Call history fetched successfully',
      data: callHistory,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { callHistory }
