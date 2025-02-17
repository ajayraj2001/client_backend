const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
const {
    appStatusCheck,
    settingsData
} = require("../../controllers/astrologer/siteSettingController");

// Chat routes
router.get('/appStatusCheck', appStatusCheck);
router.get('/', authenticateAstrologer, settingsData);

module.exports = router;