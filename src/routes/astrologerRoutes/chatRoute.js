const express = require("express");
const router = express.Router();
const { authenticateAstrologer} = require("../../middlewares");
const {
  getCallHistory,
  getLastChats,
  updateAstrologerOnlineStatus
} = require("../../controllers/astrologer/chatController");

// Chat routes
router.post('/call_history', authenticateAstrologer, getCallHistory);
router.get('/last_chats', authenticateAstrologer, getLastChats);
router.post('/updateOnlineStatus', authenticateAstrologer, updateAstrologerOnlineStatus);

module.exports = router;