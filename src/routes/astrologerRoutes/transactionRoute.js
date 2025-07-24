const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");

const {
    getWalletHistory
  } = require("../../controllers/astrologer/transactionController");
  
  // User authentication routes
  router.get("/walletHistory", authenticateAstrologer, getWalletHistory);
  
  module.exports = router;