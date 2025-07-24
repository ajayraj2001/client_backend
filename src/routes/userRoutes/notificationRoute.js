const express = require('express');
const router = express.Router();

const {
 getUserNotifications
} = require('../../controllers/user/notificationController');

const { authenticateUser } = require('../../middlewares');

// Get all chadawas with search and sorting
router.get('/',authenticateUser, getUserNotifications);

module.exports = router;