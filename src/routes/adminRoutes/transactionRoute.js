const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    getCallHistory,
    getUserRecharge
} = require("../../controllers/admin/transactionController");


router.get('/', authenticateAdmin, getCallHistory);
router.get('/gst', authenticateAdmin, getUserRecharge);

module.exports = router;