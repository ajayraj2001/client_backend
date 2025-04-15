const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getAllProducts,
  getProductById,
} = require("../../controllers/user/productController");


router.get('/', authenticateUser, getAllProducts);
router.get('/:id', authenticateUser, getProductById);

module.exports = router;