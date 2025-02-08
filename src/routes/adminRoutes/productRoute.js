const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductStatus
} = require("../../controllers/admin/productController");

router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.get('/', authenticateAdmin, getAllProducts);
router.get('/:id', authenticateAdmin, getProductById);
router.put('/status/:id', authenticateAdmin, updateProductStatus);

module.exports = router;