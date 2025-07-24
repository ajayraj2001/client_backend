const { ApiError } = require('../../errorHandler');
const { AstrologerWalletHistory, Astrologer } = require('../../models');

const getWalletHistory = async (req, res, next) => {
  try {
    const astrologer_id = req.astrologer._id; // User ID from middleware
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch the user's wallet history
    const walletHistory = await AstrologerWalletHistory.find({ astrologer_id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Fetch total count for pagination
    const totalRecords = await AstrologerWalletHistory.countDocuments({ astrologer_id });


    // Fetch the user's current wallet balance from the User model (if stored separately)
    // const astrologer = await Astrologer.findById(astrologer_id).select('wallet');

    return res.status(200).json({
      success: true,
      message: 'Wallet history fetched successfully',
      data: {
        currentBalance: req.astrologer.wallet,
        walletHistory,
      },
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

module.exports = { getWalletHistory }