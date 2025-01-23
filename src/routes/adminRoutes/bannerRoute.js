const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createBanner,
  updateBanner,
  deleteBanner,
  getAllBanners,
  getBannerById,
} = require("../../controllers/admin/bannerController");

router.post('/', authenticateAdmin, createBanner);
router.put('/:id', authenticateAdmin, updateBanner);
router.delete('/:id', authenticateAdmin, deleteBanner);
router.get('/', authenticateAdmin, getAllBanners);
router.get('/:id', authenticateAdmin, getBannerById);

module.exports = router;