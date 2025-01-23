const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  initiateRecharge,
  getWalletHistory,
} = require("../../controllers/user/transactionController");

const { handleRazorpayWebhook } = require("../../controllers/paymentGateway/paymentWebhook");

// Transaction routes
router.get('/walletHistory', authenticateUser, getWalletHistory);
router.post('/recharge', authenticateUser, initiateRecharge);

// Payment webhook route
router.post('/razorpay_webhook', handleRazorpayWebhook);

module.exports = router;