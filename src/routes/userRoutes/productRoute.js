const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getAllProducts,
  getProductById,
} = require("../../controllers/user/productController");


router.get('/', authenticateAdmin, getAllProducts);
router.get('/:id', authenticateAdmin, getProductById);

module.exports = router;