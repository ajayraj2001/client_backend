const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getAllProducts,
  getProductById,
  getProductsByCategory
} = require("../../controllers/user/productController");


router.get('/', authenticateUser, getAllProducts);
router.get('/byCategory/:categoryId', authenticateUser, getProductsByCategory);
router.get('/:id', authenticateUser, getProductById);


module.exports = router;