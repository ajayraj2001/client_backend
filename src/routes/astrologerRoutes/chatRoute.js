const express = require("express");
const router = express.Router();
const { authenticateAstrologer} = require("../../middlewares");
const {
  getCallHistory,
  getLastChats,
  getChatList,
  updateAstrologerOnlineStatus
} = require("../../controllers/astrologer/chatController");

// Chat routes
router.get('/call_history', authenticateAstrologer, getCallHistory);
router.get('/getChatList', authenticateAstrologer, getChatList);
router.get('/last_chats', authenticateAstrologer, getLastChats);
router.post('/updateOnlineStatus', authenticateAstrologer, updateAstrologerOnlineStatus);

module.exports = router;