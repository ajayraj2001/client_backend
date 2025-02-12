const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
    appStatusCheck,
    settingsData
} = require("../../controllers/user/siteSettingController");

// Chat routes
router.get('/appStatusCheck', appStatusCheck);
router.get('/settingsData', authenticateUser, settingsData);

module.exports = router;