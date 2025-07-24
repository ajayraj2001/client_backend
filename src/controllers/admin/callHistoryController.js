const { ApiError } = require('../../errorHandler');
const { User, Astrologer, CallChatHistory } = require('../../models');

// Admin API to get all call/chat history with filters and pagination
const callHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, userSearch, astroSearch, page = 1, limit = 10 } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.created_at = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && { $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) })
      };
    }

    if (userSearch) {
      const users = await User.find({ 
        $or: [
          { name: { $regex: userSearch, $options: 'i' } },  
          { number: { $regex: userSearch, $options: 'i' } }  // Apply regex to number too
        ] 
      }).select('_id');      

      if (users.length > 0) {
        query.user_id = { $in: users.map(user => user._id) };
      }
    }

    // Search for multiple astrologers
    if (astroSearch) {
      const astrologers = await Astrologer.find({ 
        $or: [
          { name: { $regex: astroSearch, $options: 'i' } }, 
          { email: { $regex: astroSearch, $options: 'i' } }, 
          { number: {$regex: astroSearch, $options: 'i' } }
        ] 
      }).select('_id');

      if (astrologers.length > 0) {
        query.astrologer_id = { $in: astrologers.map(astrologer => astrologer._id) };
      }
    }

     // Fetch call history with pagination
     const callHistory = await CallChatHistory.find(query)
     .sort({ created_at: -1 })
     .skip((page - 1) * limit)
     .limit(parseInt(limit))
     .populate('user_id', 'name number')
     .populate('astrologer_id', 'name email number')

   // Get total count for pagination
   const total = await CallChatHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Call history fetched successfully',
      data: {
        callHistory,
        total,
        page: parseInt(page),
        limit
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { callHistory }
