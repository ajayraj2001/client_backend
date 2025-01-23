const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares/authenticateUser");
const {
  initiateRecharge,
  getWalletHistory,
} = require("../../controllers/user/transactionController");

const { handleRazorpayWebhook } = require("../../controllers/paymentGateway/paymentWebhook");

// Transaction routes
router.post('/recharge', authenticateUser, initiateRecharge);
router.post('/getWalletHistory', authenticateUser, getWalletHistory);

// Payment webhook route
router.post('/razorpay_webhook', handleRazorpayWebhook);

module.exports = router;