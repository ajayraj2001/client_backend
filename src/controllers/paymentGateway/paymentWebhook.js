const { ApiError } = require('../../errorHandler');
const { PendingTransaction, UserWalletHistory } = require('../../models');
const razorpay = require('../paymentGateway/razorpay');
const crypto = require('crypto');

// Handle Razorpay Webhook
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const { event, payload } = req.body;

    // Verify the webhook signature
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new ApiError('Invalid webhook signature', 400);
    }

    // Handle payment events
    if (event === 'payment.captured' || event === 'payment.failed') {
      const { id: razorpay_payment_id, order_id: razorpay_order_id, status } = payload.payment.entity;

      // Find the pending transaction
      const pendingTransaction = await PendingTransaction.findOne({
        razorpay_order_id,
      });
      if (!pendingTransaction) {
        throw new ApiError('Pending transaction not found', 404);
      }

      // Handle payment status
      if (status === 'captured') {
        // Save the transaction to the user's wallet history
        const walletHistory = new UserWalletHistory({
          user_id: pendingTransaction.user_id,
          transaction_type: 'credit',
          amount: pendingTransaction.amount,
          description: 'Wallet recharge via Razorpay',
          razorpay_order_id: pendingTransaction.razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpaySignature,
          status: 'success',
          timestamp: new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000), // IST
        });
        await walletHistory.save();

        // Delete the pending transaction
        await PendingTransaction.deleteOne({ razorpay_order_id });
      } else if (status === 'failed') {
        // Save the failed transaction to the user's wallet history
        const walletHistory = new UserWalletHistory({
          user_id: pendingTransaction.user_id,
          transaction_type: 'credit',
          amount: pendingTransaction.amount,
          description: 'Wallet recharge via Razorpay (failed)',
          razorpay_order_id: pendingTransaction.razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpaySignature,
          status: 'failed',
          timestamp: new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000), // IST
        });
        await walletHistory.save();

        // Delete the pending transaction
        await PendingTransaction.deleteOne({ razorpay_order_id });
      }
    } else if (event === 'payment.pending') {
      // Do nothing for pending payments
      return res.status(200).json({ success: true, message: 'Payment is still pending' });
    } else {
      throw new ApiError('Unhandled webhook event', 400);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleRazorpayWebhook
};