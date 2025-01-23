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
router.get("/getAstrologers", authenticateUser, getActiveAstrologers);
router.get("/getAstrologerReviews", authenticateUser, getAstrologerReviews);
router.post("/addRatingAndReview", authenticateUser, addRatingAndReview);
router.get("/getAstrologerProfileWithReviews", authenticateUser, getAstrologerProfileWithReviews);

module.exports = router;