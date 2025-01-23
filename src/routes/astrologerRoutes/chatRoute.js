const express = require("express");
const router = express.Router();
const { authenticateAstrologer} = require("../../middlewares");
const {
  getCallHistory,
  getLastChats,
} = require("../../controllers/astrologer/chatController");

// Chat routes
router.post('/call_history', authenticateAstrologer, getCallHistory);
router.get('/last_chats', authenticateAstrologer, getLastChats);

module.exports = router;