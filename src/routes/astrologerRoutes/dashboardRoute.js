const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
// const { getDashboardData } = require("../../controllers/astrologer/");

// // Dashboard routes
// router.get("/", authenticateAstrologer, getDashboardData);

module.exports = router;