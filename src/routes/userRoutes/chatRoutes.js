const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getCallHistory,
  getLastChats,
} = require("../../controllers/user/chatController");

// Chat routes
router.post('/call_history', authenticateUser, getCallHistory);
router.get('/last_chats', authenticateUser, getLastChats);

module.exports = router;