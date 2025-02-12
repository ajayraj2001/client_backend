const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    callHistory
} = require("../../controllers/admin/callHistoryController");


router.get('/', authenticateAdmin, callHistory);

module.exports = router;