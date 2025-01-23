const { ApiError } = require('../../errorHandler');
const { AstrologerWalletHistory, Astrologer } = require('../../models');

const getWalletHistory = async (req, res, next) => {
  try {
    const astrologer_id = req.astrologer._id; // User ID from middleware

    // Fetch the user's wallet history
    const walletHistory = await AstrologerWalletHistory.find({ astrologer_id })
      .sort({ timestamp: -1 }); // Sort by latest first


    // Fetch the user's current wallet balance from the User model (if stored separately)
    // const astrologer = await Astrologer.findById(astrologer_id).select('wallet');

    return res.status(200).json({
      success: true,
      message: 'Wallet history fetched successfully',
      data: {
        currentBalance: req.astrologer.wallet,
        walletHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {getWalletHistory}