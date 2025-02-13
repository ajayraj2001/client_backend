const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    getUserRecharge
} = require("../../controllers/admin/transactionController");

router.get('/gst', authenticateAdmin, getUserRecharge);

module.exports = router;