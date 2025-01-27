const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getActiveAstrologers,
  getAstroById,
  addRatingAndReview,
  getAstrologerReviews,
} = require("../../controllers/user/astrologerController");

// Astrologer routes
router.get("/", authenticateUser, getActiveAstrologers);
router.get("/:id", authenticateUser, getAstroById);
router.get("/getReviews/:id", authenticateUser, getAstrologerReviews);
router.post("/addRatingAndReview", authenticateUser, addRatingAndReview);

module.exports = router;