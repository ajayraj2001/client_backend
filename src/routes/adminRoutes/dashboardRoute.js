const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    getAdminRevenueDashboard,
    getAdminUserDashboard,
    getAdminStats,
//product
getTopSellingProducts,
getTrendingProducts,
getSalesByCategory

} = require("../../controllers/admin/dashboardController");


router.get('/revenue', getAdminRevenueDashboard);

router.get('/users', getAdminUserDashboard);

router.get('/stats', getAdminStats);

//product
router.get('/top_selling', getTopSellingProducts);

router.get('/trending', getTrendingProducts);

router.get('/sales_by_category', getSalesByCategory);

module.exports = router;
