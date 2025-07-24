const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createBanner,
  updateBanner,
  deleteBanner,
  getAllBanners,
  getBannerById,
  updateBannerStatus
} = require("../../controllers/admin/bannerController");

router.post('/', createBanner);
router.put('/:id', updateBanner);
router.delete('/:id', authenticateAdmin, deleteBanner);
router.get('/', authenticateAdmin, getAllBanners);
router.get('/:id', authenticateAdmin, getBannerById);
router.put('/status/:id', authenticateAdmin, updateBannerStatus);

module.exports = router;