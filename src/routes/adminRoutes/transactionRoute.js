const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    getCallHistory
} = require("../../controllers/admin/transactionController");


router.get('/', authenticateAdmin, getCallHistory);

module.exports = router;