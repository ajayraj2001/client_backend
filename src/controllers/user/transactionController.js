const { ApiError } = require('../../errorHandler');
const { PendingTransaction , UserWalletHistory, User} = require('../../models');
const razorpay = require('../paymentGateway/razorpay');

// Initiate Recharge
const initiateRecharge = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const user_id = req.user._id; // User ID from middleware

    // Validate amount
    if (amount <= 0) {
      throw new ApiError('Amount must be greater than 0', 400);
    }

    // Create a Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `recharge_${user_id}_${Date.now()}`, // Unique receipt ID
    });

    // Save the pending transaction
    const pendingTransaction = new PendingTransaction({
      user_id,
      amount,
      razorpay_order_id: razorpayOrder.id,
    });
    await pendingTransaction.save();

    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        razorpayOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getWalletHistory = async (req, res, next) => {
  try {
    const user_id = req.user._id; // User ID from middleware

    // Fetch the user's wallet history
    const walletHistory = await UserWalletHistory.find({ user_id })
      .sort({ timestamp: -1 }); // Sort by latest first


    // Fetch the user's current wallet balance from the User model (if stored separately)
    // const user = await User.findById(user_id).select('wallet');

    return res.status(200).json({
      success: true,
      message: 'Wallet history fetched successfully',
      data: {
        currentBalance: req.user.wallet,
        walletHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateRecharge,
  getWalletHistory,
};