const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getActiveAstrologers,
  addRatingAndReview,
  getAstrologerProfileWithReviews,
  getAstrologerReviews,
} = require("../../controllers/user/astrologerController");

// Astrologer routes
router.get("/", authenticateUser, getActiveAstrologers);
router.get("/getReviews/:id", authenticateUser, getAstrologerReviews);
router.post("/addRatingAndReview", authenticateUser, addRatingAndReview);
router.get("/getAstrologerProfile/:id", authenticateUser, getAstrologerProfileWithReviews);

module.exports = router;