const { ApiError } = require('../../errorHandler');
const { CallChatHistory, Astrologer, User, UserWalletHistory } = require('../../models');

// Admin API to get all recharge transactions with filters and pagination
const getUserRecharge = async (req, res, next) => {
  try {
    const { startDate, endDate, search, page = 1, limit = 10 } = req.query;
    
    const query = {
      transaction_type: 'credit',
      // description: 'Wallet recharge',
      status: 'success',
    };

    query.timestamp = {
      $gte: startDate ? new Date(startDate) : new Date(0),
      $lte: endDate ? new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) : new Date(),
    };

    if (search) {
      const users = await User.find({ 
        $or: [
          { name: { $regex: search, $options: 'i' } }, 
          { number: { $regex: search, $options: 'i' } }  // Apply regex to number too
        ] 
      }).select('_id');

      if (users.length > 0) {
        query.user_id = { $in: users.map(user => user._id) };
      }
    }

    const recharges = await UserWalletHistory.find(query)
      .sort({ timestamp: -1 }) // Latest transactions first
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user_id', 'number name') // Get user number
      .select('user_id amount razorpay_order_id timestamp'); // Only necessary fields

    const total = await UserWalletHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Recharge transactions fetched successfully',
      data:{ 
        recharges,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = { getUserRecharge };
