const express = require('express');
const router = express.Router();

const {
  sendNotificationToAllUsers,
  getAdminNotificationHistory
} = require('../../controllers/admin/notificationController');

const { authenticateAdmin } = require('../../middlewares');

// Send notification to all users (admin/subadmin only)
router.post('/send', authenticateAdmin, sendNotificationToAllUsers);
router.get('/my_history', authenticateAdmin, getAdminNotificationHistory);

module.exports = router;